import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { token } = await request.json();
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not set');
    // In dev, we can choose to bypass this if we want for easier testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ success: true, message: 'reCAPTCHA bypassed in development' });
    }
    return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'reCAPTCHA verification failed.', 'error-codes': data['error-codes'] }, { status: 400 });
    }
  } catch (error) {
    console.error('reCAPTCHA verification request failed:', error);
    return NextResponse.json({ success: false, message: 'Could not contact reCAPTCHA service.'}, { status: 500 });
  }
}
