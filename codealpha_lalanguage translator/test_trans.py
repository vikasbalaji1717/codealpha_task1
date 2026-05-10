from deep_translator import GoogleTranslator

langs = GoogleTranslator().get_supported_languages(as_dict=True)
print("hi:", langs.get('hindi'))
print("en:", langs.get('english'))
print("te:", langs.get('telugu'))
print("ta:", langs.get('tamil'))
print("kn:", langs.get('kannada'))
print("ml:", langs.get('malayalam'))
