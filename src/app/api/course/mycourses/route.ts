import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/middleware/firebaseAuth';
import { getUserCourses } from '@/api/controllers/course/courseController';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

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

        await getUserCourses(request as any, mockRes as any);

        return NextResponse.json(responseData, { status: statusCode });
    } catch (error) {
        console.error('Get courses API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
