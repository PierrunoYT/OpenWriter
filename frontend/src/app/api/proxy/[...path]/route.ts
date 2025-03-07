import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
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
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const url = `${backendUrl}/api/${path}`;
  
  console.log(`Proxying POST request to: ${url}`);
  
  try {
    const body = await request.json();
    
    // Special handling for generate endpoint
    if (path === 'ai/generate') {
      console.log(`Proxying chat/generate request with ${body.messages?.length || 0} messages`);
      
      // Check if messages array is valid
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        console.error('Invalid messages array in request');
        return NextResponse.json(
          { error: 'Invalid messages array in request' },
          { status: 400 }
        );
      }
      
      // Log message roles for debugging
      const roles = body.messages.map((msg: any) => msg.role).join(', ');
      console.log(`Message roles: ${roles}`);
    }
    
    // Make the API request to backend
    console.log(`Making POST request to backend: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    
    console.log(`Backend POST response status: ${response.status}`);
    
    // Handle unsuccessful responses
    if (!response.ok) {
      // Try to get response text for more detailed error
      try {
        const text = await response.text();
        console.error(`Backend POST error response (${response.status}):`, text);
        
        // Return the error with backend status code and message
        return NextResponse.json(
          { error: `Backend API error: ${text || 'No error details provided'}` },
          { status: response.status }
        );
      } catch (textError) {
        console.error('Failed to read error response text:', textError);
        
        // Return generic error if we can't get details
        return NextResponse.json(
          { error: `Backend returned status ${response.status} with no details` },
          { status: response.status }
        );
      }
    }
    
    // Handle successful responses
    try {
      // First get the response as text
      const responseText = await response.text();
      
      // Check if we got an empty response
      if (!responseText || responseText.trim() === '') {
        console.error('Backend returned empty response');
        return NextResponse.json(
          { error: 'Backend returned empty response' },
          { status: 500 }
        );
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log(`Successfully received and parsed POST response from backend`);
        return NextResponse.json(data);
      } catch (jsonError) {
        console.error('Failed to parse backend response as JSON:', jsonError, 'Response was:', responseText);
        return NextResponse.json(
          { error: 'Backend returned invalid JSON' },
          { status: 500 }
        );
      }
    } catch (responseError) {
      console.error('Error reading backend response:', responseError);
      return NextResponse.json(
        { error: 'Failed to read backend response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Error proxying to ${url}:`, error);
    
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Failed to send data to API: ${errorMessage}` },
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