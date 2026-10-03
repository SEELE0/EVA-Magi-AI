import { DecisionServiceError } from './services/decision-service';
import type { useTranslation } from 'react-i18next';

type Translator = ReturnType<typeof useTranslation>['t'];

export function localizeError(error: unknown, t: Translator): string {
  if (!(error instanceof Error)) return t('decision.requestFailed');
  if (error instanceof TypeError) return t('decision.networkError');
  if (!(error instanceof DecisionServiceError)) return error.message || t('decision.requestFailed');

  switch (error.code) {
    case 'AGENT_CONFIG_INVALID': return t('settings.configError');
    case 'AGENT_HTTP_ERROR': return t('settings.providerError') + (error.status ? ` (HTTP ${error.status})` : '');
    case 'AGENT_NETWORK_UNAVAILABLE':
    case 'NETWORK_UNAVAILABLE': return t('decision.networkError');
    case 'REQUEST_TIMEOUT': return t('errors.timeout');
    case 'REQUEST_ABORTED': return t('errors.cancelled');
    case 'AGENT_RESPONSE_TOO_LARGE': return t('errors.responseTooLarge');
    case 'INVALID_AGENT_RESULT':
    case 'INVALID_RESPONSE': return t('decision.requestFailed');
    case 'INVALID_REQUEST': return t('decision.invalidMotion');
    case 'BUSY': return t('errors.busy');
    case 'NOT_FOUND': return t('history.missing');
    default: return error.message || t('decision.requestFailed');
  }
}
