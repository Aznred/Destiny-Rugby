"""Compléments factuels des effectifs. Les notes restent des estimations du jeu.
Utiliser le Python disposant de pypdf. Les fichiers bruts restent dans node_modules.
"""
import json, re, html, urllib.request
from datetime import date
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'node_modules'
DEST = ROOT / 'sources/competitions/feminines/effectifs-complementaires.json'
TODAY = date(2026, 10, 9)
PDF = 'https://ferugby.es/wp-content/uploads/2024/10/Guia-Liga-Iberdrola-24-25.pdf'
IRFU = 'https://www.irishrugby.ie/2026/04/10/energiaail-womens-division-semi-final-previews/'
HARBOUR = 'https://www.harbourrugby.co.nz/newsarticle/169002?newsfeedId=1691366'
SCORERS = 'https://www.irishrugby.ie/2026/01/13/nic-dhonnacha-and-pearse-kick-off-2026-at-top-of-energiaail-scoring-charts'
SQUAD = 'https://www.irishrugby.ie/2026/03/18/bemand-names-ireland-squad-for-2026-guinness-womens-six-nations'

def fetch(url, path):
    if not path.exists():
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
            path.write_bytes(response.read())
    return path

def text(url, filename):
    raw = fetch(url, CACHE / filename).read_text(encoding='utf8')
    raw = re.sub(r'<(?:script|style)\b[\s\S]*?</(?:script|style)>', '', raw)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', raw)))

clubs = {}
def add(club, source, row):
    clubs.setdefault(club, {'source': source, 'collecte': TODAY.isoformat(), 'joueuses': []})['joueuses'].append({**row, 'source': source})

# Seules les lignes avec une date de naissance exploitable sont importées du guide.
# Une fiche internationale plus récente dans le catalogue reste prioritaire.
pages = PdfReader(fetch(PDF, CACHE / 'roster-espagne.pdf')).pages
position = r'(Centro|Utility Back|Utility Forward|Utility|Pilier|Primera|Segunda(?: Línea)?|Tercera|tercera|Terceera|Talona|Apertura(?:/ Centro)?|Medio(?: [Mm]el[éÉ])?|Ala|Zaguero|[123]ª\s*/?\s*[123]?ª?\s*/?\s*[123]?ª?\s*[Ll]ínea|Flanker|Delantera/Centro)'
for idx, club in [(4, 'Rugby Majadahonda'), (5, 'Rugby Majadahonda'), (9, 'El Salvador'), (10, 'El Salvador'), (14, 'Sevilla Cocos')]:
    for line in pages[idx].extract_text().splitlines():
        match = re.fullmatch(r'(.+?)\s*' + position + r'\s*(\d{1,2}/\d{1,2}/\d{4})\s*(.+)', line.strip())
        if not match: continue
        name, pos, dob, country = match.groups()
        day, month, year = map(int, dob.split('/'))
        if month > 12 and day <= 12: day, month = month, day
        try: born = date(year, month, day)
        except ValueError: continue
        age = TODAY.year - year - ((TODAY.month, TODAY.day) < (month, day))
        if age < 18 or age > 42: continue
        line_type = 'avant' if any(p in pos.lower() for p in ['pilier','primera','segunda','tercera','terceera','talona','utility forward','línea','flanker']) else 'arriere'
        add(club, PDF, {'nom': name.strip(), 'positionSource': pos, 'ligne': line_type,
            'dateNaissance': born.isoformat(), 'age': age, 'nation': {'España':'Espagne','Argentina':'Argentine','Chile':'Chili','Francia':'France','Italia':'Italie','Canadá':'Canada','EEUU':'États-Unis','Nueva Zelanda':'Nouvelle-Zélande','Bolivia':'Bolivie'}.get(country, country), 'saisonSource': '2024-2025'})

# Les XV et bancs de demi-finales sont explicitement publiés par l'IRFU, avril 2026.
irfu = text(IRFU, 'roster-irlande2026.html')
order = ['arriere','ailier_droit','deuxieme_centre','premier_centre','ailier_gauche','demi_ouverture','demi_melee',
         'pilier_gauche','talonneur','pilier_droit','deuxieme_ligne_g','deuxieme_ligne_d','troisieme_aile_g','troisieme_aile_d','numero_8']
for label, club in [('UL BOHEMIAN','UL Bohemian RFC'),('OLD BELVEDERE','Old Belvedere RFC'),('BLACKROCK COLLEGE','Blackrock College RFC'),('RAILWAY UNION','Railway Union RFC')]:
    match = re.search(re.escape(label) + r': (.*?) Replacements: (.*?)(?= [A-Z][A-Z ]+:| Recent League)', irfu)
    if not match: raise ValueError('XV introuvable : ' + label)
    starters = [re.sub(r'\s*\(capt\)\.?', '', n).strip(' .') for n in re.split('[;,]', match[1])]
    if len(starters) != 15: raise ValueError('XV incomplet : ' + label)
    for name, pos in zip(starters, order): add(club, IRFU, {'nom': name, 'poste': pos, 'saisonSource': '2025-2026'})
    for name in match[2].strip(' .').split(', '): add(club, IRFU, {'nom': name.strip(' .'), 'saisonSource': '2025-2026'})

# Le classement officiel des marqueuses complète aussi les clubs des deux divisions.
scorers = text(SCORERS, 'roster-irlande-scorers.html')
scorers = scorers.split('TRIES', 1)[1].split('Keep up to date', 1)[0]
clubs_irish = {'UL Bohemian':'UL Bohemian RFC','Old Belvedere':'Old Belvedere RFC','Blackrock College':'Blackrock College RFC',
    'Railway Union':'Railway Union RFC','Galwegians':'Galwegians RFC','Wicklow':'Wicklow RFC',
    'Cooke':'Cooke RFC','Ennis':'Ennis RFC','Ballincollig':'Ballincollig RFC','Tullow':'Tullow RFC'}
for match in re.finditer(r'([^(),–]+)\s*\(([^)]+)\)', scorers):
    name = re.sub(r'^\s*\d+\s*[-–]?\s*', '', match[1]).strip()
    club = clubs_irish.get(match[2])
    if club and name: add(club, SCORERS, {'nom': name, 'saisonSource': '2025-2026'})

# Les doubles affiliations Celtic Challenge / club AIL sont confirmées par la sélection.
squad = text(SQUAD, 'roster-irlande-selection.html').split('Forwards (21):', 1)[1].split('Ireland Fixtures', 1)[0]
for match in re.finditer(r'([^()*]+)\(([^)]+)\)', squad):
    name = match[1].split('Backs (15):')[-1].strip()
    if match[2].isdigit(): continue
    for club in match[2].split('/'):
        club = club.strip()
        if club in set(clubs_irish.values()) or club == 'Enniskillen RFC':
            add(club, SQUAD, {'nom': name, 'saisonSource': '2026'})

# North Harbour : effectif SENIOR 2026, lignes avants et arrières publiées par l'union.
raw = fetch(HARBOUR, CACHE / 'roster-harbour.html').read_text(encoding='utf8')
raw = html.unescape(raw)
for segment, line_type in [(raw.split('Forwards:')[1].split('Backs:')[0], 'avant'), (raw.split('Backs:')[1].split('Team Behind')[0], 'arriere')]:
    for item in re.findall(r'<li[^>]*>([\s\S]*?)</li>', segment):
        name = re.sub(r'<[^>]*>', '', item).split('(')[0].strip()
        if name: add('North Harbour Hibiscus', HARBOUR, {'nom': name, 'ligne': line_type, 'saisonSource': '2026'})
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text(json.dumps(clubs, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print({club: len(info['joueuses']) for club, info in clubs.items()})
