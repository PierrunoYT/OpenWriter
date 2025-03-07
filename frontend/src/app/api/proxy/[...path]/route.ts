import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const url = `${backendUrl}/api/${path}${request.nextUrl.search}`;
  
  console.log(`Proxying GET request to: ${url}`);
  
  try {
    console.log(`Making request to backend: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    console.log(`Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Backend error response (${response.status}):`, text);
      
      // No fallback models
      
      throw new Error(`Backend returned status ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    console.log(`Successfully received data from backend, keys: ${Object.keys(data).join(', ')}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error proxying to ${url}:`, error);
    
    // No fallback models
    
    return NextResponse.json(
      { error: 'Failed to fetch from API', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const url = `${backendUrl}/api/${path}`;
  
  console.log(`Proxying POST request to: ${url}`);
  
  try {
    const body = await request.json();
    console.log(`Making POST request to backend: ${url} with body keys: ${Object.keys(body).join(', ')}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    console.log(`Backend POST response status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Backend POST error response (${response.status}):`, text);
      throw new Error(`Backend returned status ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    console.log(`Successfully received POST response from backend`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error proxying to ${url}:`, error);
    return NextResponse.json(
      { error: 'Failed to send data to API' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}