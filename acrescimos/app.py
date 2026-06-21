from flask import Flask, render_template, request
import re

# --- SUAS FUNÇÕES PYTHON EXISTENTES ---

def parse_time_to_seconds(time_str):
    """Converte uma string de tempo 'MM'SS''' para segundos totais."""
    match = re.match(r"(\d+)'(\d+)\''", time_str)
    if match:
        minutes = int(match.group(1))
        seconds = int(match.group(2))
        return minutes * 60 + seconds
    return None

def format_seconds_to_time_str(total_seconds):
    """Converte segundos totais para o formato 'MM'SS'''."""
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}'{seconds:02d}'\'"

def _calculate_acrescimo_for_half(lines_for_half):
    """
    Função auxiliar para calcular o acréscimo para um conjunto específico de linhas (um tempo).
    Contém a lógica central de filtragem, parsing e cálculo.
    """
    event_times_in_seconds = []
    event_time_strings = []

    for line in lines_for_half:
        # Desconsiderar linhas com "MM' + SS''"
        if re.match(r"^\d+'\s*\+\s*\d+'", line):
            continue 

        # Encontra o padrão de tempo no início da linha (ex: "44'27''")
        time_match = re.match(r"(\d+)'(\d+)\''", line)
        if time_match:
            time_str = time_match.group(0) 
            total_seconds = parse_time_to_seconds(time_str)
            if total_seconds is not None:
                event_times_in_seconds.append(total_seconds)
                event_time_strings.append(time_str)
    
    total_acrescimo_seconds = 0
    moments_of_acrescimo = []
    
    for i in range(len(event_times_in_seconds) - 1):
        current_event_time = event_times_in_seconds[i]
        next_event_time = event_times_in_seconds[i+1]
        
        current_event_time_str = event_time_strings[i]
        next_event_time_str = event_time_strings[i+1]
        
        time_difference = current_event_time - next_event_time
        
        if time_difference >= 60:
            minutes_to_add = time_difference // 60
            seconds_to_add = minutes_to_add * 60
            
            total_acrescimo_seconds += seconds_to_add
            moments_of_acrescimo.append((seconds_to_add, current_event_time_str, next_event_time_str, time_difference))
                
    acrescimo_minutes = total_acrescimo_seconds // 60
    acrescimo_seconds = total_acrescimo_seconds % 60 

    return acrescimo_minutes, acrescimo_seconds, moments_of_acrescimo

def calculate_acrescimo(radar_text):
    """
    Calcula o tempo de acréscimo para o primeiro e segundo tempo separadamente,
    ou infere qual tempo é se 'Intervalo' não for encontrado.
    """
    lines = radar_text.strip().split('\n')
    
    second_half_raw_lines = []
    first_half_raw_lines = []
    found_intervalo = False

    for line in lines:
        if line.strip().lower() == "intervalo":
            found_intervalo = True
            continue
        
        if not found_intervalo:
            second_half_raw_lines.append(line)
        else:
            first_half_raw_lines.append(line)

    # Inicializa os resultados para ambos os tempos como vazios
    results = {
        "primeiro_tempo": (0, 0, []),
        "segundo_tempo": (0, 0, [])
    }

    if found_intervalo:
        # Se "Intervalo" foi encontrado, processa ambos os tempos normalmente
        results["segundo_tempo"] = _calculate_acrescimo_for_half(second_half_raw_lines)
        results["primeiro_tempo"] = _calculate_acrescimo_for_half(first_half_raw_lines)
    else:
        # Se "Intervalo" NÃO foi encontrado, todas as linhas estão em second_half_raw_lines.
        # Precisamos inferir se é o primeiro ou segundo tempo.
        
        all_data_results = _calculate_acrescimo_for_half(second_half_raw_lines)
        
        # Tenta encontrar o maior tempo nas linhas fornecidas
        highest_time_in_seconds = None
        for line in second_half_raw_lines:
            time_match = re.match(r"(\d+)'(\d+)\''", line)
            if time_match:
                highest_time_in_seconds = parse_time_to_seconds(time_match.group(0))
                break # O primeiro tempo válido na lista (que está em ordem decrescente) é o maior
        
        if highest_time_in_seconds is not None:
            # Se o maior tempo for menor que 45 minutos (2700 segundos), é provavelmente o primeiro tempo
            if highest_time_in_seconds < (45 * 60):
                results["primeiro_tempo"] = all_data_results
            else:
                results["segundo_tempo"] = all_data_results
        # Se highest_time_in_seconds for None, significa que não havia tempos válidos na entrada,
        # então os resultados permanecem (0,0,[]) para ambos, o que é correto.

    return results

# --- FIM DAS SUAS FUNÇÕES PYTHON EXISTENTES ---


app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', results=None, error=None)

@app.route('/calculate', methods=['POST'])
def calculate():
    radar_data = request.form['radar_text_input']
    if not radar_data.strip():
        return render_template('index.html', error="Nenhum dado foi fornecido. Por favor, cole o texto do radar.", results=None)

    results = calculate_acrescimo(radar_data)
    return render_template('index.html', results=results, error=None)

if __name__ == '__main__':
    app.run(debug=True)
