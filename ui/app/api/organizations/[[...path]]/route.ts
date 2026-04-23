import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function fetchFromBackend(path: string, init?: RequestInit) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth_token')?.value;

  const headers = new Headers(init?.headers || {});
  if (sessionCookie) {
    headers.set('Cookie', `auth_token=${sessionCookie}`);
  }

  const response = await fetch(`http://localhost:5001${path}`, {
    ...init,
    headers,
  });

  return response;
}

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const pathWithoutPrefix = pathname.replace('/api', '');

  try {
    const response = await fetchFromBackend(pathWithoutPrefix);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from backend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
