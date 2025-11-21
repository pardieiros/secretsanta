# Configuração de Email

## Teste de Email

Para testar o envio de emails, execute:

```bash
cd backend
source venv/bin/activate
python manage.py test_email marcodaniel93@hotmail.com
```

## Configuração para Envio Real de Emails

### Opção 1: Gmail (Recomendado para desenvolvimento)

1. Ative a verificação em duas etapas na sua conta Google
2. Gere uma "App Password" (Senha de App):
   - Vá para: https://myaccount.google.com/apppasswords
   - Selecione "Mail" e "Other (Custom name)"
   - Digite "Secret Santa" e clique em "Generate"
   - Copie a senha gerada (16 caracteres)

3. Configure as variáveis de ambiente no ficheiro `.env`:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=seu_email@gmail.com
EMAIL_HOST_PASSWORD=sua_app_password_aqui
DEFAULT_FROM_EMAIL=seu_email@gmail.com
```

### Opção 2: Hotmail/Outlook

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=seu_email@hotmail.com
EMAIL_HOST_PASSWORD=sua_senha
DEFAULT_FROM_EMAIL=seu_email@hotmail.com
```

### Opção 3: Outros Serviços SMTP

Para outros serviços, ajuste:
- `EMAIL_HOST`: servidor SMTP do seu provedor
- `EMAIL_PORT`: geralmente 587 (TLS) ou 465 (SSL)
- `EMAIL_USE_TLS`: True para porta 587, False para 465
- `EMAIL_USE_SSL`: True para porta 465 (adicione esta linha se necessário)

## Teste Após Configuração

Após configurar as variáveis de ambiente, teste novamente:

```bash
python manage.py test_email marcodaniel93@hotmail.com
```

Se tudo estiver correto, verá:
```
✓ Email sent successfully to marcodaniel93@hotmail.com!
```

E o email será realmente enviado (não apenas impresso no console).

## Notas Importantes

- **Gmail**: Requer App Password, não use a senha normal da conta
- **Hotmail/Outlook**: Pode precisar de permitir "apps menos seguros" ou usar App Password
- **Desenvolvimento**: Para desenvolvimento local, pode usar o console backend (padrão)
- **Produção**: Sempre use SMTP real em produção





