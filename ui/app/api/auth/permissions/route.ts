import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth_token')?.value;

  if (!sessionCookie) {
    return NextResponse.json({ permissions: [] });
  }

  try {
    const response = await fetch('http://localhost:5001/auth/permissions', {
      headers: {
        'Cookie': `auth_token=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ permissions: [] });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ permissions: [] });
  }
}
