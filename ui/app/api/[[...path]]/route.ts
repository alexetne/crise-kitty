import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.BACKEND_BASE_URL ?? 'http://localhost:5001';

function buildForwardHeaders(request: Request) {
  const headers = new Headers();

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('authorization', authorization);
  }

  const deviceId = request.headers.get('x-device-id');
  if (deviceId) {
    headers.set('x-device-id', deviceId);
  }

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const accept = request.headers.get('accept');
  if (accept) {
    headers.set('accept', accept);
  }

  return headers;
}

async function proxy(request: Request) {
  const { pathname, search } = new URL(request.url);
  const backendPath = `${pathname.replace('/api', '')}${search}`;

  const method = request.method.toUpperCase();
  const shouldIncludeBody = method !== 'GET' && method !== 'HEAD';
  const body = shouldIncludeBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(`${backendBaseUrl}${backendPath}`, {
    method,
    headers: buildForwardHeaders(request),
    body: body ? Buffer.from(body) : undefined,
    redirect: 'manual',
  });

  const forwardHeaders = new Headers();
  const responseContentType = response.headers.get('content-type');
  if (responseContentType) {
    forwardHeaders.set('content-type', responseContentType);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: forwardHeaders,
  });
}

export async function GET(request: Request) {
  return proxy(request);
}

export async function POST(request: Request) {
  return proxy(request);
}

export async function PUT(request: Request) {
  return proxy(request);
}

export async function PATCH(request: Request) {
  return proxy(request);
}

export async function DELETE(request: Request) {
  return proxy(request);
}

