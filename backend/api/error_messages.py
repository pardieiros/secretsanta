"""
Error messages for API responses.
Supports i18n through language codes.
"""

ERROR_MESSAGES = {
    'en': {
        'validation': {
            'password_mismatch': 'Password fields did not match.',
            'email_exists': 'A user with this email already exists.',
            'username_exists': 'A user with this username already exists.',
            'email_required': 'Email is required.',
            'password_required': 'Password is required.',
            'invalid_credentials': 'Invalid email or password.',
            'validation_failed': 'Validation failed.',
            'min_participants': 'Minimum participants must be at least 2.',
            'draw_date_before_exchange': 'Draw date must be before exchange date.',
            'max_gift_ideas': 'Maximum {max} gift ideas per group allowed.',
        },
        'auth': {
            'registration_failed': 'Failed to create user.',
            'login_failed': 'Login failed. Please check your credentials.',
            'token_invalid': 'Invalid or expired token.',
            'unauthorized': 'Authentication required.',
        },
        'groups': {
            'not_found': 'Group not found.',
            'not_owner': 'Only the group owner can perform this action.',
            'not_member': 'You are not a member of this group.',
            'already_member': 'Already a member of this group.',
            'draw_already_completed': 'Draw has already been completed for this group.',
            'draw_conditions_not_met': 'Draw conditions not met.',
            'invalid_invite_code': 'Invalid invite code.',
        },
        'gift_ideas': {
            'not_found': 'Gift idea not found.',
            'not_author': 'Only the author can modify this gift idea.',
            'max_reached': 'Maximum {max} gift ideas per group allowed.',
            'duplicate_title': 'A gift idea with this title already exists for this group.',
        },
        'general': {
            'server_error': 'An error occurred. Please try again later.',
            'not_found': 'Resource not found.',
            'permission_denied': 'You do not have permission to perform this action.',
        },
    },
    'pt': {
        'validation': {
            'password_mismatch': 'As palavras-passe não coincidem.',
            'email_exists': 'Já existe um utilizador com este email.',
            'username_exists': 'Já existe um utilizador com este nome de utilizador.',
            'email_required': 'Email é obrigatório.',
            'password_required': 'Palavra-passe é obrigatória.',
            'invalid_credentials': 'Email ou palavra-passe inválidos.',
            'validation_failed': 'Falha na validação.',
            'min_participants': 'O número mínimo de participantes deve ser pelo menos 2.',
            'draw_date_before_exchange': 'A data do sorteio deve ser anterior à data da troca.',
            'max_gift_ideas': 'Máximo de {max} ideias de presente por grupo permitidas.',
        },
        'auth': {
            'registration_failed': 'Falha ao criar utilizador.',
            'login_failed': 'Falha no login. Por favor, verifique as suas credenciais.',
            'token_invalid': 'Token inválido ou expirado.',
            'unauthorized': 'Autenticação necessária.',
        },
        'groups': {
            'not_found': 'Grupo não encontrado.',
            'not_owner': 'Apenas o proprietário do grupo pode realizar esta ação.',
            'not_member': 'Não é membro deste grupo.',
            'already_member': 'Já é membro deste grupo.',
            'draw_already_completed': 'O sorteio já foi concluído para este grupo.',
            'draw_conditions_not_met': 'Condições do sorteio não foram atendidas.',
            'invalid_invite_code': 'Código de convite inválido.',
        },
        'gift_ideas': {
            'not_found': 'Ideia de presente não encontrada.',
            'not_author': 'Apenas o autor pode modificar esta ideia de presente.',
            'max_reached': 'Máximo de {max} ideias de presente por grupo permitidas.',
            'duplicate_title': 'Já existe uma ideia de presente com este título para este grupo.',
        },
        'general': {
            'server_error': 'Ocorreu um erro. Por favor, tente novamente mais tarde.',
            'not_found': 'Recurso não encontrado.',
            'permission_denied': 'Não tem permissão para realizar esta ação.',
        },
    },
}


def get_error_message(key: str, language: str = 'en', **kwargs) -> str:
    """
    Get error message by key and language.
    
    Args:
        key: Error key in format 'category.subcategory.message'
        language: Language code ('en' or 'pt')
        **kwargs: Format arguments for the message
    
    Returns:
        Formatted error message
    """
    lang = language if language in ERROR_MESSAGES else 'en'
    messages = ERROR_MESSAGES[lang]
    
    keys = key.split('.')
    message = messages
    
    try:
        for k in keys:
            message = message[k]
        
        if isinstance(message, str):
            return message.format(**kwargs) if kwargs else message
        return str(message)
    except (KeyError, AttributeError):
        # Fallback to English if key not found
        if lang != 'en':
            return get_error_message(key, 'en', **kwargs)
        return key

