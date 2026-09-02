import pyodbc
from django.conf import settings

def test_db_connection():
    try:
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={settings.DATABASES['default']['HOST']};"
            f"DATABASE={settings.DATABASES['default']['NAME']};"
            f"UID={settings.DATABASES['default']['USER']};"
            f"PWD={settings.DATABASES['default']['PASSWORD']}"
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"Erro na conexão: {e}")
        return False