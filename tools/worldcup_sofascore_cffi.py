import json
import os
import random
import sys
import time
import base64
from datetime import datetime, timezone, timedelta
from pathlib import Path
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None


ROOT = Path(__file__).resolve().parents[1]
DEPS = ROOT / "tools" / "python_deps"
if DEPS.exists():
    sys.path.insert(0, str(DEPS))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from curl_cffi import requests
except Exception as exc:
    print(json.dumps({
        "ok": False,
        "source": "Sofascore",
        "error": f"curl_cffi indisponivel: {exc}"
    }, ensure_ascii=False))
    sys.exit(0)


API = "https://www.sofascore.com/api/v1"
TOURNAMENT_ID = 16
try:
    BR_TZ = ZoneInfo("America/Sao_Paulo") if ZoneInfo else timezone(timedelta(hours=-3))
except Exception:
    BR_TZ = timezone(timedelta(hours=-3))
PROFILES = ["chrome131", "chrome136", "chrome142", "chrome145"]
HEADERS = {
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.sofascore.com/",
    "Origin": "https://www.sofascore.com",
    "X-Requested-With": "XMLHttpRequest",
}

TEAM_ALIASES = {
    "Czechia": "Czech Republic",
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "United States": "USA",
    "United States of America": "USA",
    "Türkiye": "Turkey",
    "Côte d'Ivoire": "Ivory Coast",
    "Cote d'Ivoire": "Ivory Coast",
    "Korea Republic": "South Korea",
    "Democratic Republic of the Congo": "DR Congo",
    "Congo DR": "DR Congo",
    "Cape Verde Islands": "Cape Verde",
    "Cabo Verde": "Cape Verde",
    "Curaçao": "Curacao",
}


def api_get(path, timeout=25, retries=3):
    url = path if path.startswith("http") else f"{API}{path}"
    last_error = None
    for attempt in range(retries):
        try:
            response = requests.get(
                url,
                headers=HEADERS,
                impersonate=random.choice(PROFILES),
                timeout=timeout,
            )
            if response.status_code == 404:
                return None
            if response.status_code in (403, 429, 503):
                last_error = f"HTTP {response.status_code}: {response.text[:160]}"
                time.sleep(min(8, 1.5 * (attempt + 1)))
                continue
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            last_error = str(exc)
            time.sleep(min(5, 0.8 * (attempt + 1)))
    raise RuntimeError(last_error or "falha desconhecida")


def fetch_image_data_url(url, timeout=18, retries=2):
    if not url:
        return ""
    last_error = None
    for attempt in range(retries):
        try:
            response = requests.get(
                url,
                headers={
                    **HEADERS,
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                },
                impersonate=random.choice(PROFILES),
                timeout=timeout,
            )
            if response.status_code == 404:
                return ""
            if response.status_code in (403, 429, 503):
                last_error = f"HTTP {response.status_code}"
                time.sleep(min(5, 1.2 * (attempt + 1)))
                continue
            response.raise_for_status()
            content_type = response.headers.get("content-type") or "image/png"
            payload = base64.b64encode(response.content).decode("ascii")
            return f"data:{content_type.split(';')[0]};base64,{payload}"
        except Exception as exc:
            last_error = str(exc)
            time.sleep(min(4, 0.7 * (attempt + 1)))
    return ""


def normalize_team(name):
    value = str(name or "").strip()
    return TEAM_ALIASES.get(value, value)


def team_name(team):
    return normalize_team(team.get("name") or team.get("shortName") or team.get("displayName"))


def country_code(team):
    code = (
        team.get("country", {}).get("alpha2")
        or team.get("country", {}).get("alpha3")
        or team.get("country", {}).get("nameCode")
        or ""
    )
    return str(code).lower()


def br_datetime_from_timestamp(timestamp):
    if not timestamp:
        return "", ""
    dt = datetime.fromtimestamp(int(timestamp), tz=timezone.utc).astimezone(BR_TZ)
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")


def normalize_status(event):
    status = event.get("status") or {}
    status_type = str(status.get("type") or "").lower()
    description = status.get("description") or status.get("code") or ""
    if status_type == "finished" or status.get("code") == 100:
        return "Encerrado"
    if status_type in ("inprogress", "pause") or status.get("code") in (6, 7, 31, 32):
        return "Ao vivo"
    return "Agendado"


def live_clock(event, status):
    if status != "Ao vivo":
        return ""
    time_info = event.get("time") or {}
    period_start = time_info.get("currentPeriodStartTimestamp")
    if period_start:
        elapsed = max(0, int((datetime.now(timezone.utc).timestamp() - int(period_start)) // 60))
        detail = str(event.get("status", {}).get("description") or "").lower()
        base = 45 if "2nd" in detail or "second" in detail else 0
        return f"{min(130, base + elapsed)}'"
    return event.get("status", {}).get("description") or "Ao vivo"


def live_clock_meta(event, status):
    if status != "Ao vivo":
        return {"periodStartTimestamp": None, "baseMinute": 0}
    time_info = event.get("time") or {}
    detail = str(event.get("status", {}).get("description") or "").lower()
    return {
        "periodStartTimestamp": time_info.get("currentPeriodStartTimestamp"),
        "baseMinute": 45 if "2nd" in detail or "second" in detail else 0,
    }


def infer_group(event):
    tournament = event.get("tournament") or {}
    group_name = str(tournament.get("groupName") or tournament.get("name") or event.get("roundInfo", {}).get("name") or "")
    for token in group_name.replace("-", " ").split():
        if len(token) == 1 and token.isalpha() and token.upper() in list("ABCDEFGHIJKL"):
            return token.upper()
    return "-"


def normalize_event(event):
    home_team = event.get("homeTeam") or {}
    away_team = event.get("awayTeam") or {}
    date, hour = br_datetime_from_timestamp(event.get("startTimestamp"))
    home_score = event.get("homeScore") or {}
    away_score = event.get("awayScore") or {}
    status = normalize_status(event)
    clock_meta = live_clock_meta(event, status)
    has_score = status in ("Encerrado", "Ao vivo")
    venue = event.get("venue") or {}
    round_info = event.get("roundInfo") or {}

    return {
        "id": f"sofa-{event.get('id')}",
        "sofascoreId": event.get("id"),
        "customId": event.get("customId") or "",
        "slug": event.get("slug") or "",
        "group": infer_group(event),
        "round": round_info.get("round") or round_info.get("name") or "",
        "date": date,
        "time": hour,
        "home": team_name(home_team),
        "away": team_name(away_team),
        "homeCode": country_code(home_team),
        "awayCode": country_code(away_team),
        "venue": venue.get("stadium", {}).get("name") or venue.get("name") or "",
        "city": venue.get("city", {}).get("name") or venue.get("cityName") or "",
        "status": status,
        "statusDetail": event.get("status", {}).get("description") or "",
        "clock": live_clock(event, status),
        "livePeriodStartTimestamp": clock_meta["periodStartTimestamp"],
        "livePeriodBaseMinute": clock_meta["baseMinute"],
        "homeScore": int(home_score.get("current")) if has_score and home_score.get("current") is not None else None,
        "awayScore": int(away_score.get("current")) if has_score and away_score.get("current") is not None else None,
        "source": "Sofascore",
    }


def find_worldcup_2026_season():
    data = api_get(f"/unique-tournament/{TOURNAMENT_ID}/seasons/")
    seasons = data.get("seasons") if data else []
    for season in seasons:
        if "2026" in str(season.get("year") or season.get("name") or ""):
            return season.get("id")
    return 58210


def fetch_events(season_id):
    events = []
    errors = []
    for round_number in range(1, 12):
        try:
            data = api_get(f"/unique-tournament/{TOURNAMENT_ID}/season/{season_id}/events/round/{round_number}")
            round_events = data.get("events") if data else []
            if not round_events:
                if round_number > 4:
                    break
                continue
            events.extend(round_events)
        except Exception as exc:
            errors.append({"round": round_number, "error": str(exc)})
            if round_number > 4:
                break
    unique = {}
    for event in events:
        if event.get("id"):
            unique[event["id"]] = event
    return list(unique.values()), errors


def empty_leader(player, team):
    return {
        "player": player,
        "team": team,
        "goals": 0,
        "assists": 0,
        "yellowCards": 0,
        "redCards": 0,
        "games": 0,
        "min": 0,
    }


def add_leader(store, player, team, field):
    if not player or not team:
        return
    key = f"{player}|{team}"
    item = store.setdefault(key, empty_leader(player, team))
    item[field] += 1


def extract_player_name(obj):
    if not isinstance(obj, dict):
        return ""
    return obj.get("name") or obj.get("shortName") or obj.get("slug", "").replace("-", " ").title()


def build_leaders(matches):
    scorer_map = {}
    assist_map = {}
    card_map = {}
    errors = []
    relevant = [match for match in matches if match.get("sofascoreId") and match.get("status") in ("Encerrado", "Ao vivo")]

    for match in relevant[:96]:
        try:
            data = api_get(f"/event/{match['sofascoreId']}/incidents", timeout=20, retries=2)
            incidents = data.get("incidents") if data else []
            for incident in incidents:
                incident_type = str(incident.get("incidentType") or incident.get("type") or "").lower()
                team = match["home"] if incident.get("isHome") else match["away"]
                if incident_type == "goal" and not incident.get("isOwnGoal"):
                    add_leader(scorer_map, extract_player_name(incident.get("player")), team, "goals")
                    for assist_key in ("assist1", "assist2"):
                        assist = extract_player_name(incident.get(assist_key))
                        add_leader(assist_map, assist, team, "assists")
                if incident_type == "card":
                    card_type = str(incident.get("incidentClass") or "").lower()
                    field = "redCards" if "red" in card_type else "yellowCards"
                    add_leader(card_map, extract_player_name(incident.get("player")), team, field)
        except Exception as exc:
            errors.append({"eventId": match.get("sofascoreId"), "error": str(exc)})

    def sorted_items(store, field):
        return sorted(store.values(), key=lambda item: (-item.get(field, 0), item.get("player", "")))

    return {
        "scorers": sorted_items(scorer_map, "goals"),
        "assists": sorted_items(assist_map, "assists"),
        "cards": sorted(
            card_map.values(),
            key=lambda item: (-(item.get("yellowCards", 0) + item.get("redCards", 0)), item.get("player", ""))
        ),
        "leaderErrors": errors,
    }


def normalize_top_player(item):
    player = item.get("player") or {}
    team = item.get("team") or {}
    stats = item.get("statistics") or {}
    return {
        "player": extract_player_name(player),
        "team": team_name(team),
        "teamId": team.get("id"),
        "goals": int(stats.get("goals") or 0),
        "assists": int(stats.get("assists") or 0),
        "yellowCards": int(stats.get("yellowCards") or 0),
        "redCards": int(stats.get("redCards") or 0),
        "games": int(stats.get("appearances") or 0),
        "rating": stats.get("rating") or "",
    }


def fetch_competition_leaders(unique_tournament_id, season_id):
    try:
        data = api_get(
            f"/unique-tournament/{unique_tournament_id}/season/{season_id}/top-players/overall",
            timeout=20,
            retries=2,
        ) or {}
        top = data.get("topPlayers") or {}
        yellow = [normalize_top_player(item) for item in top.get("yellowCards", [])]
        red = [normalize_top_player(item) for item in top.get("redCards", [])]
        card_map = {}
        for item in yellow + red:
            key = f"{item.get('player')}|{item.get('team')}"
            merged = card_map.setdefault(key, {**item, "yellowCards": 0, "redCards": 0})
            merged["yellowCards"] = max(merged.get("yellowCards", 0), item.get("yellowCards", 0))
            merged["redCards"] = max(merged.get("redCards", 0), item.get("redCards", 0))
        return {
            "scorers": [normalize_top_player(item) for item in top.get("goals", [])],
            "assists": [normalize_top_player(item) for item in top.get("assists", [])],
            "cards": sorted(
                card_map.values(),
                key=lambda item: (-(item.get("yellowCards", 0) + item.get("redCards", 0)), item.get("player", "")),
            ),
            "leaderErrors": [],
        }
    except Exception as exc:
        return {
            "scorers": [],
            "assists": [],
            "cards": [],
            "leaderErrors": [{"leaders": "top-players", "error": str(exc)}],
        }


def fetch_standings(season_id, unique_tournament_id=TOURNAMENT_ID):
    try:
        data = api_get(f"/unique-tournament/{unique_tournament_id}/season/{season_id}/standings/total", timeout=20, retries=2)
        return data.get("standings") or []
    except Exception as exc:
        return {"error": str(exc)}


def compact_player(item):
    player = item.get("player") or item
    return {
        "name": extract_player_name(player),
        "shortName": player.get("shortName") or extract_player_name(player),
        "position": player.get("position") or item.get("position") or "",
        "number": player.get("jerseyNumber") or item.get("shirtNumber") or "",
        "rating": item.get("statistics", {}).get("rating") or item.get("rating") or "",
        "captain": bool(item.get("captain")),
        "substitute": bool(item.get("substitute")),
    }


def normalize_lineup_side(side):
    side = side or {}
    players = [compact_player(item) for item in side.get("players", [])]
    starters = [item for item in players if not item.get("substitute")]
    bench = [item for item in players if item.get("substitute")]
    missing = [compact_player(item) for item in side.get("missingPlayers", [])]
    return {
        "formation": side.get("formation") or "",
        "manager": extract_player_name(side.get("manager")) or side.get("manager", {}).get("name") or "",
        "starters": starters,
        "bench": bench,
        "missing": missing,
        "best": sorted(
            [item for item in players if item.get("rating")],
            key=lambda item: float(item.get("rating") or 0),
            reverse=True
        )[:5],
    }


def normalize_incident(incident, home_name, away_name):
    kind = str(incident.get("incidentType") or incident.get("type") or "").lower()
    team = home_name if incident.get("isHome") else away_name
    player = extract_player_name(incident.get("player"))
    payload = {
        "type": kind,
        "class": incident.get("incidentClass") or "",
        "minute": incident.get("time"),
        "addedTime": incident.get("addedTime"),
        "team": team,
        "player": player,
        "text": incident.get("text") or "",
        "homeScore": incident.get("homeScore"),
        "awayScore": incident.get("awayScore"),
    }
    if kind == "substitution":
        payload["playerIn"] = extract_player_name(incident.get("playerIn"))
        payload["playerOut"] = extract_player_name(incident.get("playerOut"))
    if kind == "goal":
        payload["assist1"] = extract_player_name(incident.get("assist1"))
        payload["assist2"] = extract_player_name(incident.get("assist2"))
        payload["ownGoal"] = bool(incident.get("isOwnGoal"))
        payload["penalty"] = "penalty" in str(incident.get("incidentClass") or "").lower()
    return payload


def flatten_statistics(data):
    useful_keys = {
        "ballPossession", "expectedGoals", "bigChanceCreated", "totalShotsOnGoal",
        "shotsOnGoal", "goalkeeperSaves", "cornerKicks", "fouls", "passes",
        "accuratePasses", "yellowCards", "redCards", "hitWoodwork", "shotsOffGoal",
        "blockedScoringAttempt", "bigChanceMissed", "freeKicks", "offsides"
    }
    rows = []
    periods = data.get("statistics") or []
    all_period = next((item for item in periods if item.get("period") == "ALL"), periods[0] if periods else {})
    for group in all_period.get("groups", []):
        for item in group.get("statisticsItems", []):
            if item.get("key") in useful_keys:
                rows.append({
                    "key": item.get("key"),
                    "name": item.get("name"),
                    "home": item.get("home"),
                    "away": item.get("away"),
                    "homeValue": item.get("homeValue"),
                    "awayValue": item.get("awayValue"),
                })
    return rows


def normalize_shot(shot, home_name, away_name):
    player = shot.get("player") or {}
    return {
        "minute": shot.get("time"),
        "team": home_name if shot.get("isHome") else away_name,
        "player": extract_player_name(player),
        "xg": shot.get("xg"),
        "xgot": shot.get("xgot"),
        "result": shot.get("shotType") or shot.get("situation") or "",
        "bodyPart": shot.get("bodyPart") or "",
        "goal": bool(shot.get("isGoal")),
    }


def fetch_match_details(event_id):
    event_data = api_get(f"/event/{event_id}") or {}
    event = event_data.get("event") or {}
    home_name = team_name(event.get("homeTeam") or {})
    away_name = team_name(event.get("awayTeam") or {})
    status = normalize_status(event)
    date, hour = br_datetime_from_timestamp(event.get("startTimestamp"))
    home_score = event.get("homeScore") or {}
    away_score = event.get("awayScore") or {}

    def safe(path):
        try:
            return api_get(path, timeout=20, retries=2) or {}
        except Exception as exc:
            return {"_error": str(exc)}

    lineups = safe(f"/event/{event_id}/lineups")
    incidents = safe(f"/event/{event_id}/incidents")
    statistics = safe(f"/event/{event_id}/statistics")
    graph = safe(f"/event/{event_id}/graph")
    shotmap = safe(f"/event/{event_id}/shotmap")
    h2h = safe(f"/event/{event_id}/h2h")
    pregame = safe(f"/event/{event_id}/pregame-form")
    venue = event.get("venue") or {}
    referee = event.get("referee") or {}

    return {
        "ok": True,
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": int(event_id),
        "match": {
            "id": f"sofa-{event_id}",
            "sofascoreId": int(event_id),
            "home": home_name,
            "away": away_name,
            "date": date,
            "time": hour,
            "status": status,
            "statusDetail": event.get("status", {}).get("description") or "",
            "clock": live_clock(event, status),
            "homeScore": home_score.get("current"),
            "awayScore": away_score.get("current"),
            "venue": venue.get("stadium", {}).get("name") or venue.get("name") or "",
            "city": venue.get("city", {}).get("name") or venue.get("cityName") or "",
            "referee": referee.get("name") or "",
        },
        "lineups": {
            "confirmed": bool(lineups.get("confirmed")),
            "home": normalize_lineup_side(lineups.get("home")),
            "away": normalize_lineup_side(lineups.get("away")),
            "error": lineups.get("_error", ""),
        },
        "incidents": [
            normalize_incident(item, home_name, away_name)
            for item in incidents.get("incidents", [])
            if item.get("incidentType") not in ("period", "injuryTime")
        ],
        "statistics": flatten_statistics(statistics),
        "momentum": graph.get("graphPoints", []),
        "shots": [normalize_shot(item, home_name, away_name) for item in shotmap.get("shotmap", [])],
        "pregame": pregame,
        "h2h": h2h,
        "errors": {
            "event": event_data.get("_error", ""),
            "lineups": lineups.get("_error", ""),
            "incidents": incidents.get("_error", ""),
            "statistics": statistics.get("_error", ""),
            "momentum": graph.get("_error", ""),
            "shots": shotmap.get("_error", ""),
            "h2h": h2h.get("_error", ""),
            "pregame": pregame.get("_error", ""),
        },
    }


def logo_url(team_id):
    return f"https://api.sofascore.app/api/v1/team/{team_id}/image" if team_id else ""


def normalize_competition_event(event):
    home_team = event.get("homeTeam") or {}
    away_team = event.get("awayTeam") or {}
    date, hour = br_datetime_from_timestamp(event.get("startTimestamp"))
    status = normalize_status(event)
    has_score = status in ("Encerrado", "Ao vivo")
    home_score = event.get("homeScore") or {}
    away_score = event.get("awayScore") or {}
    venue = event.get("venue") or {}
    round_info = event.get("roundInfo") or {}
    home_id = home_team.get("id")
    away_id = away_team.get("id")
    return {
        "id": f"sofa-{event.get('id')}",
        "sofascoreId": event.get("id"),
        "customId": event.get("customId") or "",
        "slug": event.get("slug") or "",
        "round": round_info.get("round") or round_info.get("name") or "",
        "date": date,
        "time": hour,
        "home": team_name(home_team),
        "away": team_name(away_team),
        "homeTeamId": home_id,
        "awayTeamId": away_id,
        "homeLogo": logo_url(home_id),
        "awayLogo": logo_url(away_id),
        "venue": venue.get("stadium", {}).get("name") or venue.get("name") or "",
        "city": venue.get("city", {}).get("name") or venue.get("cityName") or "",
        "status": status,
        "statusDetail": event.get("status", {}).get("description") or "",
        "clock": live_clock(event, status),
        "livePeriodStartTimestamp": live_clock_meta(event, status)["periodStartTimestamp"],
        "livePeriodBaseMinute": live_clock_meta(event, status)["baseMinute"],
        "homeScore": int(home_score.get("current")) if has_score and home_score.get("current") is not None else None,
        "awayScore": int(away_score.get("current")) if has_score and away_score.get("current") is not None else None,
        "source": "Sofascore",
    }


def normalize_standing_row(row):
    team = row.get("team") or {}
    team_id = team.get("id")
    form = []
    for item in row.get("form", []) or []:
        if isinstance(item, str):
            form.append(item)
        elif isinstance(item, dict):
            form.append(item.get("result") or item.get("outcome") or item.get("status") or "")
    form = [str(item).strip().upper() for item in form if str(item or "").strip()][-5:]
    return {
        "position": row.get("position"),
        "team": team_name(team),
        "teamId": team_id,
        "logo": logo_url(team_id),
        "played": row.get("matches"),
        "wins": row.get("wins"),
        "draws": row.get("draws"),
        "losses": row.get("losses"),
        "scoresFor": row.get("scoresFor"),
        "scoresAgainst": row.get("scoresAgainst"),
        "goalDiff": row.get("scoreDiffFormatted") or row.get("scoreDiff"),
        "points": row.get("points"),
        "form": form,
    }


def fetch_competition_events(unique_tournament_id, season_id):
    events = []
    errors = []
    empty_rounds = 0
    for round_number in range(1, 70):
        try:
            data = api_get(f"/unique-tournament/{unique_tournament_id}/season/{season_id}/events/round/{round_number}", timeout=20, retries=2)
            round_events = data.get("events") if data else []
            if not round_events:
                empty_rounds += 1
                if empty_rounds >= 3 and round_number > 3:
                    break
                continue
            empty_rounds = 0
            events.extend(round_events)
        except Exception as exc:
            errors.append({"round": round_number, "error": str(exc)})
            if round_number > 3:
                break
    unique = {}
    for event in events:
        if event.get("id"):
            unique[event["id"]] = event
    return list(unique.values()), errors


def fetch_competition(unique_tournament_id, season_id, name="Competicao"):
    raw_events, errors = fetch_competition_events(unique_tournament_id, season_id)
    matches = [normalize_competition_event(event) for event in raw_events]
    matches = [match for match in matches if match.get("home") and match.get("away") and match.get("date")]
    matches.sort(key=lambda item: f"{item.get('date')} {item.get('time')}")
    standings_payload = fetch_standings(season_id, unique_tournament_id)
    standings = []
    if isinstance(standings_payload, list) and standings_payload:
        standings = [normalize_standing_row(row) for row in standings_payload[0].get("rows", [])]
    logo_cache = {}
    for row in standings:
        team_id = row.get("teamId")
        if team_id and team_id not in logo_cache:
            logo_cache[team_id] = fetch_image_data_url(logo_url(team_id))
        row["logoData"] = logo_cache.get(team_id, "")
    leaders = fetch_competition_leaders(unique_tournament_id, season_id)
    return {
        "ok": bool(matches or standings),
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "competition": {
            "name": name,
            "uniqueTournamentId": unique_tournament_id,
            "seasonId": season_id,
            "logo": f"https://api.sofascore.app/api/v1/unique-tournament/{unique_tournament_id}/image",
            "logoData": fetch_image_data_url(f"https://api.sofascore.app/api/v1/unique-tournament/{unique_tournament_id}/image"),
        },
        "count": len(matches),
        "matches": matches,
        "standings": standings,
        "scorers": leaders["scorers"],
        "assists": leaders["assists"],
        "cards": leaders["cards"],
        "errors": errors + leaders["leaderErrors"],
    }


def main():
    try:
        if len(sys.argv) >= 3 and sys.argv[1] == "details":
            print(json.dumps(fetch_match_details(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 4 and sys.argv[1] == "competition":
            name = sys.argv[4] if len(sys.argv) >= 5 else "Competicao"
            print(json.dumps(fetch_competition(int(sys.argv[2]), int(sys.argv[3]), name), ensure_ascii=False))
            return

        season_id = find_worldcup_2026_season()
        raw_events, event_errors = fetch_events(season_id)
        matches = [normalize_event(event) for event in raw_events]
        matches = [match for match in matches if match.get("home") and match.get("away") and match.get("date")]
        matches.sort(key=lambda item: f"{item.get('date')} {item.get('time')}")
        leaders = build_leaders(matches)
        result = {
            "ok": bool(matches),
            "source": "Sofascore",
            "seasonId": season_id,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(matches),
            "matches": matches,
            "standings": fetch_standings(season_id),
            "scorers": leaders["scorers"],
            "assists": leaders["assists"],
            "cards": leaders["cards"],
            "errors": event_errors + leaders["leaderErrors"],
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "source": "Sofascore",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }, ensure_ascii=False))


if __name__ == "__main__":
    main()
