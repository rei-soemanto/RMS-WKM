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

// ─── Device Remote Access ───────────────────────────────────────────

export async function getRemoteAccessLinks(
  deviceId: string
): Promise<unknown> {
  return rmsRequest(`/devices/${deviceId}/remote-access`);
}

// ─── Export types ───────────────────────────────────────────────────

export type { TeltonikaDevice, TeltonikaResponse, TeltonikaAPIError };
