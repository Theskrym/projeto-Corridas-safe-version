import hashlib

senha_texto = 'admin123'
hash_sha256 = hashlib.sha256(senha_texto.encode()).hexdigest()
print(hash_sha256)
# Resultado: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9