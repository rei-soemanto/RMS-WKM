/**
 * Teltonika RMS API Wrapper
 *
 * All communication with Teltonika's API is proxied through the secure
 * Next.js backend using the environment variable TELTONIKA_RMS_API_TOKEN.
 * This module is NEVER imported on the client side.
 */

const RMS_BASE_URL = 'https://rms.teltonika-networks.com/api';

interface TeltonikaDevice {
  id: string;
  name: string;
  mac: string;
  serial: string;
  status: string;
  [key: string]: unknown;
}

interface TeltonikaResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

class TeltonikaAPIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TeltonikaAPIError';
    this.status = status;
  }
}

async function rmsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = process.env.TELTONIKA_RMS_API_TOKEN;
  if (!token) {
    throw new TeltonikaAPIError('TELTONIKA_RMS_API_TOKEN is not configured', 500);
  }

  const url = `${RMS_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new TeltonikaAPIError(
      `Teltonika API error: ${response.status} — ${errorText}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

// ─── Device Operations ───────────────────────────────────────────────

export async function getDevices(): Promise<TeltonikaResponse<TeltonikaDevice[]>> {
  return rmsRequest<TeltonikaResponse<TeltonikaDevice[]>>('/devices');
}

export async function getDevice(id: string): Promise<TeltonikaResponse<TeltonikaDevice>> {
  return rmsRequest<TeltonikaResponse<TeltonikaDevice>>(`/devices/${id}`);
}

export async function rebootDevice(id: string): Promise<unknown> {
  return rmsRequest(`/devices/${id}/reboot`, { method: 'POST' });
}

// ─── Command Execution ──────────────────────────────────────────────

export async function executeCommand(
  deviceId: string,
  command: string
): Promise<unknown> {
  return rmsRequest(`/devices/${deviceId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

// ─── Device Logs ────────────────────────────────────────────────────

export async function getDeviceLogs(
  deviceId: string
): Promise<TeltonikaResponse<unknown[]>> {
  return rmsRequest<TeltonikaResponse<unknown[]>>(`/devices/${deviceId}/logs`);
}

// ─── Device Remote Access (RMS Connect) ────────────────────────────

export interface RemoteAccessConfig {
  id: number;
  name: string;
  type: string;       // 'http' | 'ssh' | 'tcp'
  port: number;
  enabled: boolean;
  [key: string]: unknown;
}

export interface RemoteSession {
  url: string;        // The temporary access URL
  expires_at: string; // ISO timestamp when the link expires
  [key: string]: unknown;
}

/**
 * List all remote access configurations (HTTP, SSH, TCP) for a device.
 * Requires scope: device_remote_access:read
 */
export async function getRemoteAccessConfigs(
  deviceId: string
): Promise<TeltonikaResponse<RemoteAccessConfig[]>> {
  const rawData = await rmsRequest<TeltonikaResponse<any[]>>(
    `/devices/remote-access?device_id=${deviceId}`
  );

  // Map the Teltonika API response schema to our UI component schema
  const mappedConfigs: RemoteAccessConfig[] = (rawData.data || []).map((item) => ({
    id: item.id,
    name: item.is_main ? 'Device WebUI (Main)' : (item.name || 'Remote Config'),
    type: item.protocol || 'http',
    port: item.destination_port || 80,
    enabled: true, // Default to enabled as Teltonika lists active configs
  }));

  return {
    ...rawData,
    data: mappedConfigs,
  };
}

/**
 * Start/Initiate an RMS Connect session channel.
 * Requires scope: device_remote_access:write
 */
export async function createRemoteSession(
  accessId: number,
  durationSeconds: number = 3600
): Promise<{ success: boolean; meta?: { channel?: string } }> {
  return rmsRequest<{ success: boolean; meta?: { channel?: string } }>(
    `/devices/connect/${accessId}`,
    {
      method: 'POST',
      body: JSON.stringify({
        duration: durationSeconds,
      }),
    }
  );
}

/**
 * List active RMS Connect sessions for an access configuration.
 * Requires scope: device_remote_access:read
 */
export async function getRemoteSessions(
  accessId: number
): Promise<TeltonikaResponse<RemoteSession[]>> {
  return rmsRequest<TeltonikaResponse<RemoteSession[]>>(
    `/devices/connect/${accessId}/sessions`
  );
}

/**
 * Check the connection status of a Pusher channel.
 * Note: This endpoint does NOT use the "/api" prefix and sits at the root.
 */
export async function getChannelStatus(
  channelName: string
): Promise<{ success: boolean; data?: Record<string, Array<{ status: string; value: string; errorCode?: number }>> }> {
  const token = process.env.TELTONIKA_RMS_API_TOKEN;
  if (!token) {
    throw new TeltonikaAPIError('TELTONIKA_RMS_API_TOKEN is not configured', 500);
  }

  const url = `https://rms.teltonika-networks.com/status/channel/${channelName}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new TeltonikaAPIError(
      `Teltonika status API error: ${response.status} — ${errorText}`,
      response.status
    );
  }

  return response.json();
}

// ─── Export types ───────────────────────────────────────────────────

export type { TeltonikaDevice, TeltonikaResponse, TeltonikaAPIError };
