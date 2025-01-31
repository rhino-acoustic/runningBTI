import type { Metadata } from 'next';
import './globals.css';
import localFont from 'next/font/local';

// Freesentation 폰트 설정
const freesentation = localFont({
    src: [
        {
            path: '../font/Freesentation-1Thin.ttf',
            weight: '100',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-2ExtraLight.ttf',
            weight: '200',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-3Light.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-4Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-5Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-6SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-7Bold.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-8ExtraBold.ttf',
            weight: '800',
            style: 'normal',
        },
        {
            path: '../font/Freesentation-9Black.ttf',
            weight: '900',
            style: 'normal',
        },
    ],

    variable: '--font-freesentation',
});

export const metadata: Metadata = {
    title: '테스트',
    description: '테스트 설명',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" className={freesentation.variable} data-oid="7fa0x0y">
            <body className="font-sans w-full" data-oid=".8ydz7g">
                <div className="max-w-[720px] mx-auto bg-[#f5f5f5] w-full" data-oid="73m4x4d">
                    {children}
                </div>
            </body>
        </html>
    );
}
