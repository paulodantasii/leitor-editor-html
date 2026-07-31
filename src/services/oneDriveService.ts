import { getAccessToken } from './msalService';
import { OneDriveItem } from '../types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Lists items in OneDrive folder (root or specified folderId).
 */
export async function listOneDriveItems(folderId?: string): Promise<OneDriveItem[]> {
  const token = await getAccessToken();
  const endpoint = folderId
    ? `${GRAPH_BASE_URL}/me/drive/items/${folderId}/children`
    : `${GRAPH_BASE_URL}/me/drive/root/children`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const items: OneDriveItem[] = data.value || [];

  // Filter only folders and .html/.htm files
  return items.filter((item) => {
    if (item.folder) return true;
    if (item.file) {
      const name = item.name.toLowerCase();
      return name.endsWith('.html') || name.endsWith('.htm');
    }
    return false;
  });
}

/**
 * Downloads text content of a file from OneDrive.
 */
export async function downloadOneDriveFile(fileId: string): Promise<string> {
  const token = await getAccessToken();
  const response = await fetch(`${GRAPH_BASE_URL}/me/drive/items/${fileId}/content`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file from OneDrive: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Overwrites an existing file in OneDrive with new HTML content.
 */
export async function saveOneDriveFile(fileId: string, content: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${GRAPH_BASE_URL}/me/drive/items/${fileId}/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Failed to save file to OneDrive: ${response.statusText}`);
  }
}
