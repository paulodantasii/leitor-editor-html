import { PublicClientApplication, Configuration, AccountInfo } from '@azure/msal-browser';
import { UserProfile } from '../types';

const AZURE_CLIENT_ID_KEY = 'leitor_html_azure_client_id';
const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000000'; // Default placeholder, editable by user in Settings

export function getStoredClientId(): string {
  return localStorage.getItem(AZURE_CLIENT_ID_KEY) || import.meta.env.VITE_AZURE_CLIENT_ID || '';
}

export function setStoredClientId(clientId: string): void {
  localStorage.setItem(AZURE_CLIENT_ID_KEY, clientId);
  // Re-initialize MSAL instance
  msalInstance = null;
}

export const LOGIN_SCOPES = ['User.Read', 'Files.ReadWrite', 'Files.ReadWrite.All'];

let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication | null> {
  const clientId = getStoredClientId();
  if (!clientId || clientId === DEFAULT_CLIENT_ID) {
    return null;
  }

  if (!msalInstance) {
    const msalConfig: Configuration = {
      auth: {
        clientId: clientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    };

    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }

  return msalInstance;
}

/**
 * Log in user via MSAL popup.
 */
export async function loginWithOneDrive(): Promise<UserProfile | null> {
  const instance = await getMsalInstance();
  if (!instance) {
    throw new Error('CLIENT_ID_REQUIRED');
  }

  const response = await instance.loginPopup({
    scopes: LOGIN_SCOPES,
    prompt: 'select_account',
  });

  if (response.account) {
    return {
      name: response.account.name || response.account.username,
      email: response.account.username,
    };
  }

  return null;
}

/**
 * Gets active account if logged in.
 */
export async function getActiveAccount(): Promise<AccountInfo | null> {
  const instance = await getMsalInstance();
  if (!instance) return null;
  const accounts = instance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Gets access token silently or via popup.
 */
export async function getAccessToken(): Promise<string> {
  const instance = await getMsalInstance();
  if (!instance) throw new Error('CLIENT_ID_REQUIRED');

  const account = await getActiveAccount();
  if (!account) throw new Error('NOT_LOGGED_IN');

  try {
    const response = await instance.acquireTokenSilent({
      scopes: LOGIN_SCOPES,
      account: account,
    });
    return response.accessToken;
  } catch (err) {
    console.warn('Silent token acquisition failed, attempting popup token request...', err);
    const response = await instance.acquireTokenPopup({
      scopes: LOGIN_SCOPES,
      account: account,
    });
    return response.accessToken;
  }
}

/**
 * Logout user.
 */
export async function logoutOneDrive(): Promise<void> {
  const instance = await getMsalInstance();
  if (!instance) return;

  const account = await getActiveAccount();
  if (account) {
    await instance.logoutPopup({
      account: account,
    });
  }
}
