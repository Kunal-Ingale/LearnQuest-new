import { NextRequest, NextResponse } from 'next/server';
import { handleConvert } from '@/api/controllers/convert/convertController';
import connectDB from '@/lib/mongodb';
import admin from '@/utils/firebase';

export async function POST(request: NextRequest) {
    try {
        await connectDB();

        // Verify Firebase token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const body = await request.json();

        // Create mock request with user info
        const mockReq: any = {
            user: decodedToken,
            body,
            headers: Object.fromEntries(request.headers.entries()),
        };

        let responseData: any;
        let statusCode = 200;

        const mockRes = {
            status: (code: number) => ({
                json: (data: any) => {
                    statusCode = code;
                    responseData = data;
                    return mockRes;
                }
            }),
            json: (data: any) => {
                responseData = data;
                return mockRes;
            }
        };

        await handleConvert(mockReq, mockRes as any);

        return NextResponse.json(responseData, { status: statusCode });
    } catch (error: any) {
        console.error('Convert API error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
