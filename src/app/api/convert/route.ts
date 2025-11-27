import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/middleware/firebaseAuth';
import { handleConvert } from '@/api/controllers/convert/convertController';

export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyFirebaseToken(request as any, {} as any, () => { });

        if (!authResult) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        await handleConvert(request as any, mockRes as any);

        return NextResponse.json(responseData, { status: statusCode });
    } catch (error) {
        console.error('Convert API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
