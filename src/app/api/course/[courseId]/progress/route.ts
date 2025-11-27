import { NextRequest, NextResponse } from 'next/server';
import { getCourseProgress, updateCourseProgress } from '@/api/controllers/course/courseController';
import connectDB from '@/lib/mongodb';
import admin from '@/utils/firebase';

export async function GET(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const mockReq: any = {
            user: decodedToken,
            params,
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

        await getCourseProgress(mockReq, mockRes as any);

        return NextResponse.json(responseData, { status: statusCode });
    } catch (error: any) {
        console.error('Get progress API error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { courseId: string } }
) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        const body = await request.json();

        const mockReq: any = {
            user: decodedToken,
            params,
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

        await updateCourseProgress(mockReq, mockRes as any);

        return NextResponse.json(responseData, { status: statusCode });
    } catch (error: any) {
        console.error('Update progress API error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
