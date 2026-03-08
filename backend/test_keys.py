import google.generativeai as genai
import warnings
warnings.filterwarnings('ignore')

keys = [
    'AIzaSyAFZD7l4wIxfU2u_2EnrMNdsmW3PmjfJ0U',
    'AIzaSyA1CbutmNUxHvG66pSOA3MncMKQhMsVk9k'
]

for key in keys:
    print(f"\nTesting key: {key[:15]}...")
    genai.configure(api_key=key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    try:
        response = model.generate_content('Salom', request_options={"retry": None, "timeout": 10.0})
        print('SUCCESS:', response.text.strip())
    except Exception as e:
        print('ERROR:', str(e))
