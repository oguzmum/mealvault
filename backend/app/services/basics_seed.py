"""Starter content for the cooking basics section (German UI content)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.basic import CookingBasic

SEED_BASICS: list[dict] = [
    {
        "slug": "anschwitzen",
        "title": "Anschwitzen",
        "keywords": ["anschwitzen", "glasig dünsten", "sweat", "translucent"],
        "content": (
            "Zwiebeln, Knoblauch oder anderes Gemüse bei mittlerer Hitze in etwas Fett "
            "garen, ohne dass es Farbe annimmt. Ziel ist es, die Aromen zu öffnen und die "
            "Schärfe zu mildern - die Zwiebeln werden glasig, nicht braun.\n\n"
            "Tipp: Etwas Salz dazugeben, das zieht Wasser und verhindert das Anbrennen."
        ),
    },
    {
        "slug": "anbraten-maillard",
        "title": "Scharf anbraten & Maillard-Reaktion",
        "keywords": ["anbraten", "scharf anbraten", "goldbraun braten", "sear", "brown", "maillard"],
        "content": (
            "Beim scharfen Anbraten entstehen durch die Maillard-Reaktion (ab ca. 140 °C) "
            "hunderte neue Röstaromen - das ist der Unterschied zwischen grauem und "
            "goldbraunem Fleisch.\n\n"
            "Wichtig: Pfanne richtig heiß werden lassen, Fleisch trocken tupfen und nicht "
            "zu viel auf einmal in die Pfanne geben, sonst kocht es im eigenen Saft."
        ),
    },
    {
        "slug": "blanchieren",
        "title": "Blanchieren",
        "keywords": ["blanchieren", "blanch"],
        "content": (
            "Gemüse kurz (1–3 Minuten) in kochendem Salzwasser garen und dann sofort in "
            "Eiswasser abschrecken. So bleibt es knackig und behält seine leuchtende Farbe.\n\n"
            "Klassiker: Brokkoli, Bohnen und Spinat vor dem Weiterverarbeiten blanchieren."
        ),
    },
    {
        "slug": "abloeschen",
        "title": "Ablöschen / Deglasieren",
        "keywords": ["ablöschen", "deglasieren", "deglaze"],
        "content": (
            "Nach dem Anbraten den Bratensatz (die braunen Röststoffe am Pfannenboden) mit "
            "Flüssigkeit wie Wein, Brühe oder Wasser lösen. Dieser Satz ist pures Aroma und "
            "die Basis für jede gute Sauce.\n\n"
            "Einfach Flüssigkeit in die heiße Pfanne geben und mit dem Kochlöffel den Boden "
            "freikratzen."
        ),
    },
    {
        "slug": "koecheln",
        "title": "Köcheln (Simmern)",
        "keywords": ["köcheln", "simmern", "simmer", "sieden"],
        "content": (
            "Knapp unter dem Siedepunkt garen: Die Oberfläche bewegt sich leicht, es steigen "
            "nur vereinzelt Blasen auf. Ideal für Saucen, Suppen und Schmorgerichte - "
            "sprudelndes Kochen würde Fleisch zäh machen und Saucen verbrennen lassen."
        ),
    },
    {
        "slug": "duensten",
        "title": "Dünsten",
        "keywords": ["dünsten", "dämpfen", "steam", "braise lightly"],
        "content": (
            "Schonendes Garen im eigenen Saft oder mit wenig Flüssigkeit bei geschlossenem "
            "Deckel und milder Hitze. Vitamine und Aromen bleiben besser erhalten als beim "
            "Kochen - perfekt für Fisch und feines Gemüse."
        ),
    },
    {
        "slug": "schmoren",
        "title": "Schmoren",
        "keywords": ["schmoren", "braise", "stew"],
        "content": (
            "Kombination aus scharfem Anbraten und langem, sanftem Garen in Flüssigkeit. "
            "Kollagenreiches Fleisch (z. B. Gulasch, Schmorbraten) wird dadurch butterzart.\n\n"
            "Faustregel: niedrige Temperatur, viel Zeit, Deckel drauf."
        ),
    },
    {
        "slug": "reduzieren",
        "title": "Reduzieren",
        "keywords": ["reduzieren", "einkochen", "reduce", "einköcheln"],
        "content": (
            "Eine Flüssigkeit offen kochen lassen, damit Wasser verdampft. Die Sauce wird "
            "dicker und der Geschmack konzentrierter - ganz ohne Bindemittel.\n\n"
            "Je größer die Pfanne, desto schneller geht's (mehr Verdunstungsfläche)."
        ),
    },
    {
        "slug": "karamellisieren",
        "title": "Karamellisieren",
        "keywords": ["karamellisieren", "caramelize", "caramelise"],
        "content": (
            "Zucker (auch der natürliche Zucker in Zwiebeln oder Gemüse) bei mittlerer Hitze "
            "bräunen, bis er süß-nussige Röstaromen entwickelt. Braucht Geduld: Zwiebeln "
            "karamellisieren in 20–30 Minuten, nicht in 5."
        ),
    },
    {
        "slug": "abschmecken",
        "title": "Abschmecken",
        "keywords": ["abschmecken", "würzen", "season", "nachwürzen"],
        "content": (
            "Am Ende des Kochens probieren und die Balance justieren: Salz verstärkt, Säure "
            "(Zitrone, Essig) macht frisch, Süße rundet ab, Fett trägt Aroma.\n\n"
            "Immer erst probieren, dann würzen - und Salz in kleinen Schritten dosieren."
        ),
    },
    {
        "slug": "mise-en-place",
        "title": "Mise en Place",
        "keywords": ["mise en place", "vorbereiten", "bereitstellen", "prepare"],
        "content": (
            "Alles vor dem Kochen vorbereiten: Zutaten abwiegen, Gemüse schneiden, Gewürze "
            "bereitstellen. Klingt banal, ist aber der größte Unterschied zwischen Stress "
            "und entspanntem Kochen - besonders bei schnellen Pfannengerichten."
        ),
    },
]


def seed_cooking_basics(db: Session) -> int:
    """Insert seed entries that are not present yet; returns number of inserts."""
    existing = set(db.scalars(select(CookingBasic.slug)).all())
    created = 0
    for entry in SEED_BASICS:
        if entry["slug"] in existing:
            continue
        db.add(CookingBasic(**entry))
        created += 1
    db.commit()
    return created
