"""Static keyword mapping from ingredient names to shopping categories.

Keywords cover German (user-entered) and English (TheMealDB imports) names.
Matching is substring-based on the normalized ingredient name; first hit wins,
unmatched ingredients fall back to `other`.
"""

from app.models.dish import ShoppingCategory

_KEYWORDS: list[tuple[ShoppingCategory, tuple[str, ...]]] = [
    (
        ShoppingCategory.meat_fish,
        (
            "hähnchen", "huhn", "hühner", "pute", "rind", "schwein", "hack", "speck",
            "wurst", "salami", "schinken", "lamm", "lachs", "fisch", "thunfisch",
            "garnele", "forelle", "kabeljau",
            "chicken", "beef", "pork", "bacon", "sausage", "ham", "lamb", "salmon",
            "fish", "tuna", "prawn", "shrimp", "turkey", "duck", "steak", "mince",
        ),
    ),
    (
        ShoppingCategory.dairy,
        (
            "milch", "butter", "sahne", "schmand", "quark", "joghurt", "käse", "feta",
            "mozzarella", "parmesan", "gouda", "frischkäse", "ei", "eier", "creme fraiche",
            "milk", "cream", "yoghurt", "yogurt", "cheese", "cheddar", "egg",
        ),
    ),
    (
        ShoppingCategory.frozen,
        ("tiefkühl", "tk-", "frozen", "eis"),
    ),
    (
        ShoppingCategory.produce,
        (
            "tomate", "zwiebel", "knoblauch", "kartoffel", "paprika", "zucchini",
            "aubergine", "gurke", "salat", "spinat", "brokkoli", "blumenkohl", "karotte",
            "möhre", "lauch", "sellerie", "pilz", "champignon", "kürbis", "avocado",
            "zitrone", "limette", "apfel", "banane", "beere", "ingwer", "chili",
            "petersilie", "basilikum", "koriander", "schnittlauch", "dill", "minze",
            "rosmarin", "thymian", "frühlingszwiebel", "mais", "erbse", "bohne", "rucola",
            "tomato", "onion", "garlic", "potato", "pepper", "courgette", "zucchini",
            "eggplant", "cucumber", "lettuce", "spinach", "broccoli", "cauliflower",
            "carrot", "leek", "celery", "mushroom", "pumpkin", "squash", "lemon", "lime",
            "apple", "banana", "berr", "ginger", "parsley", "basil", "coriander",
            "chive", "mint", "rosemary", "thyme", "spring onion", "shallot", "pea",
            "avocado", "cabbage", "kale",
        ),
    ),
    (
        ShoppingCategory.pantry,
        (
            "mehl", "zucker", "salz", "pfeffer", "öl", "essig", "reis", "nudel",
            "spaghetti", "pasta", "linse", "kichererbse", "dose", "passata", "brühe",
            "honig", "senf", "sojasauce", "kokosmilch", "haferflocke", "nuss", "mandel",
            "gewürz", "paprikapulver", "curry", "kreuzkümmel", "zimt", "vanille",
            "tomatenmark", "couscous", "bulgur", "quinoa", "brot", "wrap", "tortilla",
            "flour", "sugar", "salt", "oil", "vinegar", "rice", "noodle", "lentil",
            "chickpea", "stock", "broth", "honey", "mustard", "soy sauce",
            "coconut milk", "oat", "almond", "spice", "paprika powder", "cumin",
            "cinnamon", "vanilla", "tomato puree", "bread", "tahini",
        ),
    ),
]


def categorize_ingredient(name: str) -> ShoppingCategory:
    normalized = name.strip().lower()
    for category, keywords in _KEYWORDS:
        if any(keyword in normalized for keyword in keywords):
            return category
    return ShoppingCategory.other
