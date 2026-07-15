import json
import os
import random
import sys
import time
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
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


API_BASES = [
    "https://www.sofascore.com/api/v1",
    "https://api.sofascore.com/api/v1",
    "https://api.sofascore.app/api/v1",
]
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
    last_error = None
    urls = [path] if path.startswith("http") else [f"{base}{path}" for base in API_BASES]
    for url in urls:
        for attempt in range(retries):
            try:
                response = requests.get(
                    url,
                    headers=HEADERS,
                    impersonate=random.choice(PROFILES),
                    timeout=timeout,
                )
                if response.status_code == 404:
                    break
                if response.status_code in (403, 429, 503):
                    last_error = f"{url} - HTTP {response.status_code}: {response.text[:160]}"
                    time.sleep(min(4, 0.8 * (attempt + 1)))
                    continue
                response.raise_for_status()
                return response.json()
            except Exception as exc:
                last_error = f"{url} - {exc}"
                time.sleep(min(3, 0.5 * (attempt + 1)))
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
    round_info = event.get("roundInfo") or {}
    venue = extract_venue(event)

    return {
        "id": f"sofa-{event.get('id')}",
        "sofascoreId": event.get("id"),
        "customId": event.get("customId") or "",
        "slug": event.get("slug") or "",
        "group": infer_group(event),
        "round": round_info.get("round") or round_info.get("name") or "",
        "stage": round_info.get("name") or "",
        "date": date,
        "time": hour,
        "home": team_name(home_team),
        "away": team_name(away_team),
        "homeCode": country_code(home_team),
        "awayCode": country_code(away_team),
        "venue": venue["venue"],
        "city": venue["city"],
        "status": status,
        "winnerCode": event.get("winnerCode"),
        "statusDetail": event.get("status", {}).get("description") or "",
        "clock": live_clock(event, status),
        "livePeriodStartTimestamp": clock_meta["periodStartTimestamp"],
        "livePeriodBaseMinute": clock_meta["baseMinute"],
        "homeScore": int(home_score.get("current")) if has_score and home_score.get("current") is not None else None,
        "awayScore": int(away_score.get("current")) if has_score and away_score.get("current") is not None else None,
        "source": "Sofascore",
    }


def extract_venue(event):
    venue = event.get("venue") or {}
    return {
        "venue": venue.get("stadium", {}).get("name") or venue.get("name") or "",
        "city": venue.get("city", {}).get("name") or venue.get("cityName") or "",
    }


def fetch_event_venue(event_id):
    data = api_get(f"/event/{event_id}", timeout=20, retries=2) or {}
    event = data.get("event") or {}
    return extract_venue(event)


def enrich_missing_venues(matches):
    errors = []
    for match in matches:
        if match.get("venue") or match.get("city") or not match.get("sofascoreId"):
            continue
        try:
            venue = fetch_event_venue(match["sofascoreId"])
            if venue.get("venue") or venue.get("city"):
                match.update(venue)
        except Exception as exc:
            errors.append({"eventId": match.get("sofascoreId"), "venueError": str(exc)})
    return errors


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

    # Knockout matches are published in the paginated season timeline instead
    # of the numbered group-stage round endpoints.
    for direction in ("last", "next"):
        for page in range(10):
            try:
                data = api_get(
                    f"/unique-tournament/{TOURNAMENT_ID}/season/{season_id}/events/{direction}/{page}"
                ) or {}
                page_events = data.get("events") or []
                events.extend(page_events)
                if not page_events or not data.get("hasNextPage"):
                    break
            except Exception as exc:
                errors.append({"direction": direction, "page": page, "error": str(exc)})
                break

    try:
        live_data = api_get(
            f"/unique-tournament/{TOURNAMENT_ID}/season/{season_id}/events/live"
        ) or {}
        events.extend(live_data.get("events") or [])
    except Exception as exc:
        errors.append({"direction": "live", "error": str(exc)})

    # The timeline can omit the event currently crossing a status boundary.
    # Supplement it with the three known group rounds when the tournament is
    # not yet complete; IDs are deduplicated below.
    collected_ids = {event.get("id") for event in events if event.get("id")}
    if len(collected_ids) < 104:
        for round_number in range(1, 4):
            try:
                data = api_get(
                    f"/unique-tournament/{TOURNAMENT_ID}/season/{season_id}/events/round/{round_number}"
                ) or {}
                events.extend(data.get("events") or [])
            except Exception as exc:
                errors.append({"round": round_number, "error": str(exc)})
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
    venue = extract_venue(event)
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
            "venue": venue["venue"],
            "city": venue["city"],
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


def fetch_match_momentum(event_id):
    event_id = int(event_id)
    graph = api_get(f"/event/{event_id}/graph", timeout=20, retries=2) or {}
    points = graph.get("graphPoints") if isinstance(graph, dict) else []
    return {
        "ok": isinstance(points, list),
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": event_id,
        "momentum": points if isinstance(points, list) else [],
        "error": graph.get("_error", "") if isinstance(graph, dict) else "",
    }


def fetch_match_player_events(event_id):
    event_id = int(event_id)

    def safe(path):
        try:
            return api_get(path, timeout=20, retries=2) or {}
        except Exception as exc:
            return {"_error": str(exc)}

    incidents = safe(f"/event/{event_id}/incidents")
    shotmap = safe(f"/event/{event_id}/shotmap")
    return {
        "ok": bool(incidents.get("incidents") or shotmap.get("shotmap")),
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": event_id,
        "incidents": incidents.get("incidents") or [],
        "shotmap": shotmap.get("shotmap") or [],
        "errors": {
            "incidents": incidents.get("_error", ""),
            "shots": shotmap.get("_error", ""),
        },
    }


def _history_score_value(score):
    if not isinstance(score, dict):
        return None
    value = score.get("current")
    if value is None:
        value = score.get("normaltime")
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _history_period(minute):
    try:
        value = int(minute)
    except (TypeError, ValueError):
        return None
    for index, limit in enumerate((15, 30, 45, 60, 75, 120)):
        if value <= limit:
            return index
    return 5


def _load_recent_team_events(team, event_id, before_timestamp, sample_size):
    team_id = int(team.get("id"))
    payload = api_get(f"/team/{team_id}/events/last/0", timeout=25, retries=2) or {}
    candidates = sorted(
        payload.get("events") or [],
        key=lambda item: int(item.get("startTimestamp") or 0),
        reverse=True,
    )
    finished = []
    for item in candidates:
        item_id = int(item.get("id") or 0)
        timestamp = int(item.get("startTimestamp") or 0)
        if item_id == event_id or (before_timestamp and timestamp >= before_timestamp):
            continue
        if str((item.get("status") or {}).get("type") or "").lower() != "finished":
            continue
        home_score = _history_score_value(item.get("homeScore"))
        away_score = _history_score_value(item.get("awayScore"))
        if home_score is None or away_score is None:
            continue
        finished.append(item)
        if len(finished) >= sample_size:
            break
    return team, finished


def fetch_team_analysis(event_id, sample_size=5):
    event_id = int(event_id)
    sample_size = max(3, min(10, int(sample_size or 5)))
    event_payload = api_get(f"/event/{event_id}", timeout=20, retries=2) or {}
    current = event_payload.get("event") or {}
    teams = [current.get("homeTeam") or {}, current.get("awayTeam") or {}]
    before_timestamp = int(current.get("startTimestamp") or 0)
    if not all(team.get("id") for team in teams):
        return {"ok": False, "source": "Sofascore", "error": "Jogo sem equipes validas."}

    def load_team_events(team):
        return _load_recent_team_events(team, event_id, before_timestamp, sample_size)

    with ThreadPoolExecutor(max_workers=2) as executor:
        loaded = list(executor.map(load_team_events, teams))

    incident_jobs = {}
    all_events = {}
    for _team, matches in loaded:
        for match in matches:
            match_id = int(match.get("id") or 0)
            if match_id:
                all_events[match_id] = match

    def load_incidents(match_id):
        try:
            payload = api_get(f"/event/{match_id}/incidents", timeout=18, retries=2) or {}
            return match_id, payload.get("incidents") or []
        except Exception:
            return match_id, []

    with ThreadPoolExecutor(max_workers=4) as executor:
        for match_id, incidents in executor.map(load_incidents, all_events.keys()):
            incident_jobs[match_id] = incidents

    def summarize(team, matches):
        team_id = int(team.get("id"))
        periods_scored = [0] * 6
        periods_conceded = [0] * 6
        first_goal_periods = [0] * 6
        rows = []
        wins = draws = losses = scored = conceded = btts = over25 = clean_sheets = failed_to_score = 0

        for match in matches:
            is_home = int((match.get("homeTeam") or {}).get("id") or 0) == team_id
            home_score = _history_score_value(match.get("homeScore")) or 0
            away_score = _history_score_value(match.get("awayScore")) or 0
            own_score, rival_score = (home_score, away_score) if is_home else (away_score, home_score)
            scored += own_score
            conceded += rival_score
            wins += int(own_score > rival_score)
            draws += int(own_score == rival_score)
            losses += int(own_score < rival_score)
            btts += int(own_score > 0 and rival_score > 0)
            over25 += int(own_score + rival_score >= 3)
            clean_sheets += int(rival_score == 0)
            failed_to_score += int(own_score == 0)

            goals = []
            for incident in incident_jobs.get(int(match.get("id") or 0), []):
                if str(incident.get("incidentType") or "").lower() != "goal":
                    continue
                minute = incident.get("time")
                period = _history_period(minute)
                if period is None:
                    continue
                goal_is_home = bool(incident.get("isHome"))
                team_goal = goal_is_home == is_home
                target = periods_scored if team_goal else periods_conceded
                target[period] += 1
                goals.append((int(minute or 0), team_goal))
            if goals:
                first = sorted(goals, key=lambda item: item[0])[0]
                first_goal_periods[_history_period(first[0])] += 1

            date, hour = br_datetime_from_timestamp(match.get("startTimestamp"))
            opponent = match.get("awayTeam") if is_home else match.get("homeTeam")
            rows.append({
                "id": match.get("id"),
                "date": date,
                "time": hour,
                "home": team_name(match.get("homeTeam") or {}),
                "away": team_name(match.get("awayTeam") or {}),
                "homeScore": home_score,
                "awayScore": away_score,
                "opponent": team_name(opponent or {}),
                "venue": "home" if is_home else "away",
                "result": "W" if own_score > rival_score else "D" if own_score == rival_score else "L",
                "tournament": ((match.get("tournament") or {}).get("name") or ""),
            })

        count = len(rows)
        percent = lambda value: round((value / count) * 100) if count else 0
        return {
            "team": {"id": team_id, "name": team_name(team), "logo": logo_url(team_id)},
            "sampleSize": count,
            "summary": {
                "wins": wins, "draws": draws, "losses": losses,
                "goalsFor": scored, "goalsAgainst": conceded,
                "goalsForAverage": round(scored / count, 2) if count else 0,
                "goalsAgainstAverage": round(conceded / count, 2) if count else 0,
                "winPercent": percent(wins), "bttsPercent": percent(btts),
                "over25Percent": percent(over25), "cleanSheetPercent": percent(clean_sheets),
                "failedToScorePercent": percent(failed_to_score),
            },
            "periods": {"scored": periods_scored, "conceded": periods_conceded, "firstGoal": first_goal_periods},
            "matches": rows,
        }

    analyses = [summarize(team, matches) for team, matches in loaded]
    return {
        "ok": True,
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": event_id,
        "sampleSize": sample_size,
        "teams": analyses,
    }


GOAL_TYPE_KEYS = ["header", "corner", "crossedFreeKick", "directFreeKick", "throwIn", "counterAttack", "outsideBox", "penalty", "other"]


def _classify_goal_shot(shot):
    body_part = str(shot.get("bodyPart") or "").lower()
    situation = str(shot.get("situation") or "").lower().replace("_", "-")
    goal_type = str(shot.get("goalType") or "").lower().replace("_", "-")
    coordinates = shot.get("playerCoordinates") or {}
    try:
        distance = float(coordinates.get("x") or 0)
    except (TypeError, ValueError):
        distance = 0
    if "penalty" in situation or "penalty" in goal_type:
        return "penalty"
    if body_part == "head":
        return "header"
    if "corner" in situation:
        return "corner"
    if "throw" in situation:
        return "throwIn"
    if "fast" in situation or "counter" in situation:
        return "counterAttack"
    if "direct" in situation and ("free" in situation or "set" in situation):
        return "directFreeKick"
    if "free-kick" in situation or "set-piece" in situation:
        return "crossedFreeKick"
    if distance > 16.5:
        return "outsideBox"
    return "other"


def fetch_team_goal_types(event_id, sample_size=5):
    event_id = int(event_id)
    sample_size = max(3, min(10, int(sample_size or 5)))
    event_payload = api_get(f"/event/{event_id}", timeout=20, retries=2) or {}
    current = event_payload.get("event") or {}
    teams = [current.get("homeTeam") or {}, current.get("awayTeam") or {}]
    before_timestamp = int(current.get("startTimestamp") or 0)
    if not all(team.get("id") for team in teams):
        return {"ok": False, "source": "Sofascore", "error": "Jogo sem equipes validas."}

    with ThreadPoolExecutor(max_workers=2) as executor:
        loaded = list(executor.map(
            lambda team: _load_recent_team_events(team, event_id, before_timestamp, sample_size),
            teams,
        ))

    match_ids = sorted({
        int(match.get("id") or 0)
        for _team, matches in loaded
        for match in matches
        if int(match.get("id") or 0)
    })

    def load_shotmap(match_id):
        try:
            payload = api_get(f"/event/{match_id}/shotmap", timeout=18, retries=2) or {}
            return match_id, payload.get("shotmap") or []
        except Exception:
            return match_id, []

    shotmaps = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        for match_id, shots in executor.map(load_shotmap, match_ids):
            shotmaps[match_id] = shots

    def summarize(team, matches):
        team_id = int(team.get("id"))
        scored = {key: 0 for key in GOAL_TYPE_KEYS}
        conceded = {key: 0 for key in GOAL_TYPE_KEYS}
        expected_scored = expected_conceded = mapped_scored = mapped_conceded = 0
        detailed_scored = detailed_conceded = 0

        for match in matches:
            match_id = int(match.get("id") or 0)
            is_home = int((match.get("homeTeam") or {}).get("id") or 0) == team_id
            home_score = _history_score_value(match.get("homeScore")) or 0
            away_score = _history_score_value(match.get("awayScore")) or 0
            own_score, rival_score = (home_score, away_score) if is_home else (away_score, home_score)
            expected_scored += own_score
            expected_conceded += rival_score
            for shot in shotmaps.get(match_id, []):
                if str(shot.get("shotType") or "").lower() != "goal":
                    continue
                team_goal = bool(shot.get("isHome")) == is_home
                goal_type = _classify_goal_shot(shot)
                target = scored if team_goal else conceded
                target[goal_type] += 1
                if team_goal:
                    mapped_scored += 1
                    detailed_scored += int(goal_type != "other")
                else:
                    mapped_conceded += 1
                    detailed_conceded += int(goal_type != "other")

        scored["other"] += max(0, expected_scored - mapped_scored)
        conceded["other"] += max(0, expected_conceded - mapped_conceded)
        return {
            "team": {"id": team_id, "name": team_name(team), "logo": logo_url(team_id)},
            "sampleSize": len(matches),
            "scored": scored,
            "conceded": conceded,
            "coverage": {
                "scored": detailed_scored,
                "scoredTotal": expected_scored,
                "conceded": detailed_conceded,
                "concededTotal": expected_conceded,
            },
        }

    return {
        "ok": True,
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": event_id,
        "sampleSize": sample_size,
        "teams": [summarize(team, matches) for team, matches in loaded],
    }


def fetch_event_standings(event_id):
    event_id = int(event_id)
    event_payload = api_get(f"/event/{event_id}", timeout=20, retries=2) or {}
    event = event_payload.get("event") or {}
    tournament = event.get("tournament") or {}
    unique = tournament.get("uniqueTournament") or {}
    unique_tournament_id = unique.get("id") or tournament.get("uniqueTournamentId") or tournament.get("id")
    season = event.get("season") or {}
    season_id = season.get("id")
    if not unique_tournament_id:
        return {"ok": False, "source": "Sofascore", "error": "Competicao sem ID do SofaScore."}
    if not season_id:
        season_id = find_tournament_season(unique_tournament_id, calendar_event_date_key(event))
    if not season_id:
        return {"ok": False, "source": "Sofascore", "error": "Temporada da competicao nao encontrada."}

    standings_payload = fetch_standings(season_id, unique_tournament_id)
    if isinstance(standings_payload, dict) and standings_payload.get("error"):
        return {"ok": False, "source": "Sofascore", "error": standings_payload.get("error")}

    groups = []
    for group in standings_payload or []:
        rows = [normalize_standing_row(row) for row in group.get("rows", []) or []]
        groups.append({
            "id": group.get("id"),
            "name": group.get("name") or group.get("type") or "Classificacao",
            "type": group.get("type") or "",
            "rows": rows,
        })

    return {
        "ok": bool(groups),
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "eventId": event_id,
        "competition": {
            "name": tournament.get("name") or unique.get("name") or "",
            "uniqueTournamentId": int(unique_tournament_id),
            "seasonId": int(season_id),
        },
        "groups": groups,
        "error": "" if groups else "Classificacao indisponivel para esta competicao.",
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


def normalize_calendar_event(event, odds_by_event=None, image_cache=None):
    odds_by_event = odds_by_event or {}
    image_cache = image_cache if image_cache is not None else {}
    home_team = event.get("homeTeam") or {}
    away_team = event.get("awayTeam") or {}
    tournament = event.get("tournament") or {}
    category = tournament.get("category") or {}
    unique_tournament_id = tournament.get("uniqueTournament", {}).get("id") or tournament.get("id")
    status = normalize_status(event)
    status_map = {
        "Encerrado": "finished",
        "Ao vivo": "inprogress",
        "Agendado": "notstarted",
    }
    has_score = status in ("Encerrado", "Ao vivo")
    home_score = event.get("homeScore") or {}
    away_score = event.get("awayScore") or {}
    home_id = home_team.get("id")
    away_id = away_team.get("id")
    event_id = event.get("id")
    odds = odds_by_event.get(str(event_id)) or odds_by_event.get(event_id) or {}
    choices = odds.get("choices") if isinstance(odds, dict) else None
    tournament_logo_url = f"https://api.sofascore.app/api/v1/unique-tournament/{unique_tournament_id}/image" if unique_tournament_id else ""
    tournament_logo_data = image_cache.get(f"tournament:{unique_tournament_id}") if unique_tournament_id else ""

    def cached_image(key, url):
        if not url:
            return ""
        return image_cache.get(key) or url

    return {
        "id": int(event_id) if event_id else f"sofa-{event_id}",
        "sofascoreId": int(event_id) if event_id else None,
        "customId": event.get("customId") or "",
        "slug": event.get("slug") or "",
        "startTimestamp": int(event.get("startTimestamp") or 0),
        "status": {
            "type": status_map.get(status, "notstarted"),
            "description": event.get("status", {}).get("description") or status,
        },
        "homeTeam": {
            "id": home_id,
            "name": team_name(home_team),
            "countryCode": str((home_team.get("country") or {}).get("alpha2") or "").upper(),
            "national": bool(home_team.get("national")),
            "imageUrl": cached_image(f"team:{home_id}", logo_url(home_id)),
        },
        "awayTeam": {
            "id": away_id,
            "name": team_name(away_team),
            "countryCode": str((away_team.get("country") or {}).get("alpha2") or "").upper(),
            "national": bool(away_team.get("national")),
            "imageUrl": cached_image(f"team:{away_id}", logo_url(away_id)),
        },
        "homeScore": {"current": int(home_score.get("current"))} if has_score and home_score.get("current") is not None else None,
        "awayScore": {"current": int(away_score.get("current"))} if has_score and away_score.get("current") is not None else None,
        "tournament": {
            "id": tournament.get("id") or tournament.get("uniqueTournament", {}).get("id") or 0,
            "name": tournament.get("name") or "Competicao",
            "priority": int(tournament.get("priority") or 0),
            "userCount": int(tournament.get("userCount") or 0),
            "category": {
                "name": category.get("name") or "",
                "countryCode": str((category.get("country") or {}).get("alpha2") or category.get("alpha2") or "").upper(),
            },
            "logo": tournament_logo_data or tournament_logo_url,
            "logoData": tournament_logo_data,
        },
        "realOdds": choices if isinstance(choices, list) and len(choices) >= 3 else None,
        "source": "sofascore",
        "sourceLabel": "Sofascore",
    }


def fetch_calendar_date(date_key):
    started_at = time.monotonic()
    try:
        requested_date = datetime.strptime(date_key, "%Y-%m-%d").date()
    except ValueError:
        raise RuntimeError("data invalida para o calendario")

    # SofaScore removed the global scheduled-events route. Its web calendar now
    # exposes a daily category index and one event route per category. Query the
    # next UTC day as well because Brazil's local day ends after midnight UTC.
    utc_date_keys = [
        requested_date.isoformat(),
        (requested_date + timedelta(days=1)).isoformat(),
    ]
    category_targets = set()
    index_errors = []
    for utc_date_key in utc_date_keys:
        try:
            index_data = api_get(
                f"/sport/football/{utc_date_key}/0/categories",
                timeout=20,
                retries=2,
            ) or {}
            for item in index_data.get("categories") or []:
                category_id = (item.get("category") or {}).get("id")
                if category_id and int(item.get("totalEvents") or 0) > 0:
                    category_targets.add((utc_date_key, int(category_id)))
        except Exception as exc:
            index_errors.append(f"{utc_date_key}: {exc}")

    if not category_targets:
        raise RuntimeError("indice diario do SofaScore indisponivel: " + " | ".join(index_errors))

    def fetch_category_events(target):
        utc_date_key, category_id = target
        try:
            data = api_get(
                f"/category/{category_id}/scheduled-events/{utc_date_key}",
                timeout=20,
                retries=2,
            ) or {}
            return data.get("events") or [], None
        except Exception as exc:
            return [], f"{utc_date_key}/{category_id}: {exc}"

    unique_events = {}
    category_errors = []
    with ThreadPoolExecutor(max_workers=min(12, len(category_targets))) as executor:
        futures = [executor.submit(fetch_category_events, target) for target in category_targets]
        for future in as_completed(futures):
            category_events, error = future.result()
            if error:
                category_errors.append(error)
            for event in category_events:
                event_id = event.get("id")
                if event_id:
                    unique_events[event_id] = event

    events = list(unique_events.values())
    matches = [
        normalize_calendar_event(event, {}, {})
        for event in events
        if event.get("homeTeam") and event.get("awayTeam") and event.get("startTimestamp")
    ]
    matches = [match for match in matches if br_datetime_from_timestamp(match.get("startTimestamp"))[0] == date_key]
    matches.sort(key=lambda item: item.get("startTimestamp") or 0)
    return {
        "ok": True,
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "date": date_key,
        "count": len(matches),
        "matches": matches,
        "elapsedMs": int((time.monotonic() - started_at) * 1000),
        "assetsDeferred": True,
        "transport": "categories",
        "categoriesFetched": len(category_targets),
        "partial": bool(index_errors or category_errors),
        "errors": (index_errors + category_errors)[:12],
    }


def fetch_calendar_images(events):
    targets = {}
    for event in events or []:
        home_id = (event.get("homeTeam") or {}).get("id")
        away_id = (event.get("awayTeam") or {}).get("id")
        tournament = event.get("tournament") or {}
        unique_tournament_id = tournament.get("uniqueTournament", {}).get("id") or tournament.get("id")
        if home_id:
            targets[f"team:{home_id}"] = logo_url(home_id)
        if away_id:
            targets[f"team:{away_id}"] = logo_url(away_id)
        if unique_tournament_id:
            targets[f"tournament:{unique_tournament_id}"] = f"https://api.sofascore.app/api/v1/unique-tournament/{unique_tournament_id}/image"

    if not targets:
        return {}

    cache = {}
    with ThreadPoolExecutor(max_workers=min(12, len(targets))) as pool:
        futures = {
            pool.submit(fetch_image_data_url, url, 10, 1): key
            for key, url in targets.items()
            if url
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                value = future.result()
            except Exception:
                value = ""
            if value:
                cache[key] = value
    return cache


def search_tournament_logo(query):
    search = str(query or "").strip()
    if not search:
        return {"ok": False, "source": "Sofascore", "error": "Busca vazia."}

    data = api_get(f"/search/all?q={search}&page=0", timeout=25, retries=3) or {}
    results = data.get("results") or []
    candidates = []

    for item in results:
        entity = item.get("entity") or {}
        item_type = item.get("type") or ""
        unique = entity.get("uniqueTournament") or {}
        unique_id = unique.get("id") or (entity.get("id") if item_type == "uniqueTournament" else None)
        sport = (entity.get("category") or {}).get("sport") or {}
        if sport.get("slug") and sport.get("slug") != "football":
            continue
        if not unique_id:
            continue
        candidates.append({
            "id": int(unique_id),
            "name": entity.get("name") or unique.get("name") or search,
            "category": (entity.get("category") or {}).get("name") or "",
            "type": item_type,
            "score": float(item.get("score") or 0),
        })

    if not candidates:
        return {"ok": False, "source": "Sofascore", "error": "Torneio nao encontrado.", "query": search}

    candidates.sort(key=lambda item: item["score"], reverse=True)
    selected = candidates[0]
    logo_url_value = f"https://api.sofascore.app/api/v1/unique-tournament/{selected['id']}/image"
    selected["logo"] = logo_url_value
    selected["logoData"] = fetch_image_data_url(logo_url_value, timeout=18, retries=2)

    return {
        "ok": True,
        "source": "Sofascore",
        "query": search,
        "tournament": selected,
        "candidates": candidates[:5],
    }


def search_tournament_logos(queries):
    if not isinstance(queries, list):
        return {"ok": False, "source": "Sofascore", "error": "Lista de buscas invalida."}

    results = {}
    for query in queries:
        clean_query = str(query or "").strip()
        if not clean_query or clean_query in results:
            continue
        try:
            results[clean_query] = search_tournament_logo(clean_query)
        except Exception as exc:
            results[clean_query] = {
                "ok": False,
                "source": "Sofascore",
                "query": clean_query,
                "error": str(exc),
            }
        time.sleep(0.15)

    return {
        "ok": True,
        "source": "Sofascore",
        "count": len(results),
        "results": results,
    }


def find_tournament_season(unique_tournament_id, date_key=""):
    data = api_get(f"/unique-tournament/{unique_tournament_id}/seasons/", timeout=20, retries=2) or {}
    seasons = data.get("seasons") or []
    if not seasons:
        return None

    target_year = str(date_key or "")[:4]
    for season in seasons:
        text = f"{season.get('year') or ''} {season.get('name') or ''}"
        if target_year and target_year in text:
            return season.get("id")
    return seasons[0].get("id")


def calendar_event_date_key(event):
    timestamp = event.get("startTimestamp")
    if not timestamp:
        return ""
    try:
        return br_datetime_from_timestamp(timestamp)[0]
    except Exception:
        return ""


def parse_calendar_tournament_item(item):
    if isinstance(item, dict):
        query = str(item.get("query") or item.get("name") or "").strip()
        unique_id = item.get("id") or item.get("uniqueTournamentId")
        try:
            unique_id = int(unique_id) if unique_id else None
        except (TypeError, ValueError):
            unique_id = None
        return {
            "query": query or (str(unique_id) if unique_id else ""),
            "id": unique_id,
            "name": str(item.get("name") or query or "").strip(),
        }

    query = str(item or "").strip()
    return {"query": query, "id": None, "name": query}


def fetch_competition_events_for_date(unique_tournament_id, season_id, date_key):
    events = []
    errors = []
    empty_rounds = 0
    passed_target_rounds = 0

    try:
        target_date = datetime.strptime(date_key, "%Y-%m-%d").date()
    except ValueError:
        target_date = None

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
            round_dates = []
            for event in round_events:
                event_key = calendar_event_date_key(event)
                if event_key:
                    try:
                        round_dates.append(datetime.strptime(event_key, "%Y-%m-%d").date())
                    except ValueError:
                        pass
                if event_key == date_key:
                    events.append(event)

            if target_date and round_dates:
                if min(round_dates) > target_date:
                    passed_target_rounds += 1
                    if passed_target_rounds >= 2 or events:
                        break
                else:
                    passed_target_rounds = 0
        except Exception as exc:
            errors.append({"round": round_number, "error": str(exc)})
            if round_number > 3:
                break

    unique = {}
    for event in events:
        if event.get("id"):
            unique[event["id"]] = event
    return list(unique.values()), errors


def fetch_calendar_from_tournaments(date_key, queries):
    if not isinstance(queries, list):
        queries = []

    unique_queries = []
    seen = set()
    for item in queries:
        parsed = parse_calendar_tournament_item(item)
        key = str(parsed.get("id") or parsed.get("query") or "").strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique_queries.append(parsed)

    def fetch_one_tournament(item):
        query = item.get("query") or item.get("name") or ""
        try:
            tournament = None
            unique_id = item.get("id")
            if unique_id:
                tournament = {
                    "id": unique_id,
                    "name": item.get("name") or query,
                }
            else:
                found = search_tournament_logo(query)
                tournament = found.get("tournament") if found.get("ok") else None
                unique_id = tournament.get("id") if tournament else None
            if not unique_id:
                return {"events": [], "tournament": None, "errors": [{"query": query, "error": "torneio nao encontrado"}]}

            season_id = find_tournament_season(unique_id, date_key)
            if not season_id:
                return {
                    "events": [],
                    "tournament": None,
                    "errors": [{"query": query, "uniqueTournamentId": unique_id, "error": "temporada nao encontrada"}],
                }

            raw_events, event_errors = fetch_competition_events_for_date(unique_id, season_id, date_key)
            return {
                "events": raw_events,
                "tournament": {
                    "query": query,
                    "id": unique_id,
                    "seasonId": season_id,
                    "name": tournament.get("name") or query,
                },
                "errors": [
                    {"query": query, "uniqueTournamentId": unique_id, **error_item}
                    for error_item in event_errors
                ],
            }
        except Exception as exc:
            return {"events": [], "tournament": None, "errors": [{"query": query, "error": str(exc)}]}

    events = []
    errors = []
    tournaments = []
    items_to_fetch = unique_queries[:16]
    max_workers = min(4, max(1, len(items_to_fetch)))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(fetch_one_tournament, item) for item in items_to_fetch]
        for future in as_completed(futures):
            result = future.result()
            events.extend(result.get("events") or [])
            tournament = result.get("tournament")
            if tournament:
                tournaments.append(tournament)
            errors.extend(result.get("errors") or [])

    unique_events = {}
    for event in events:
        event_id = event.get("id")
        if event_id:
            unique_events[event_id] = event

    events = list(unique_events.values())
    matches = [
        normalize_calendar_event(event, {}, {})
        for event in events
        if event.get("homeTeam") and event.get("awayTeam") and event.get("startTimestamp")
    ]
    matches = [match for match in matches if br_datetime_from_timestamp(match.get("startTimestamp"))[0] == date_key]
    matches.sort(key=lambda item: item.get("startTimestamp") or 0)

    return {
        "ok": True,
        "source": "Sofascore",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "date": date_key,
        "count": len(matches),
        "matches": matches,
        "tournaments": tournaments,
        "errors": errors,
    }


def normalize_standing_row(row):
    team = row.get("team") or {}
    team_id = team.get("id")
    promotion = row.get("promotion") or {}
    if isinstance(promotion, str):
        promotion = {"name": promotion}
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
        "promotion": {
            "id": promotion.get("id") if isinstance(promotion, dict) else None,
            "name": (promotion.get("name") or promotion.get("text") or promotion.get("shortName") or promotion.get("description") or "") if isinstance(promotion, dict) else "",
        },
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
        if len(sys.argv) >= 3 and sys.argv[1] == "momentum":
            print(json.dumps(fetch_match_momentum(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "event-details":
            print(json.dumps(fetch_match_player_events(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "team-analysis":
            sample_size = int(sys.argv[3]) if len(sys.argv) >= 4 else 5
            print(json.dumps(fetch_team_analysis(sys.argv[2], sample_size), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "team-goal-types":
            sample_size = int(sys.argv[3]) if len(sys.argv) >= 4 else 5
            print(json.dumps(fetch_team_goal_types(sys.argv[2], sample_size), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "event-standings":
            print(json.dumps(fetch_event_standings(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "details":
            print(json.dumps(fetch_match_details(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 4 and sys.argv[1] == "competition":
            name = sys.argv[4] if len(sys.argv) >= 5 else "Competicao"
            print(json.dumps(fetch_competition(int(sys.argv[2]), int(sys.argv[3]), name), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "calendar":
            print(json.dumps(fetch_calendar_date(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 4 and sys.argv[1] == "calendar-tournaments":
            print(json.dumps(fetch_calendar_from_tournaments(sys.argv[2], json.loads(sys.argv[3])), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "tournament-search":
            print(json.dumps(search_tournament_logo(sys.argv[2]), ensure_ascii=False))
            return
        if len(sys.argv) >= 3 and sys.argv[1] == "tournament-search-batch":
            print(json.dumps(search_tournament_logos(json.loads(sys.argv[2])), ensure_ascii=False))
            return

        season_id = find_worldcup_2026_season()
        raw_events, event_errors = fetch_events(season_id)
        matches = [normalize_event(event) for event in raw_events]
        matches = [match for match in matches if match.get("home") and match.get("away") and match.get("date")]
        venue_errors = enrich_missing_venues(matches)
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
            "errors": event_errors + venue_errors + leaders["leaderErrors"],
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
