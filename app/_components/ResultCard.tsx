import React from 'react';

interface ResultCardProps {
    type: string;
    title: string;
    description: string;
    categories: Array<{
        title: string;
        items: string[];
    }>;
    userName?: string;
    bottomImage?: {
        image_url: string;
    };
}

export const ResultCard = ({
    type,
    title,
    description,
    categories,
    userName,
    bottomImage
}: ResultCardProps) => {
    const width = 448;
    const height = 800;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
        >
            {/* 배경 */}
            <rect width={width} height={height} fill="#FFFFFF" />
            
            {/* 워터마크 패턴 */}
            <defs>
                <pattern id="logoPattern" x="0" y="0" width="100" height="30" patternUnits="userSpaceOnUse">
                    <image href="/logo/bk.png" width="100" height="30" opacity="0.035" />
                </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#logoPattern)" opacity="0.1" />

            {/* 제목 */}
            <text x={width/2} y="50" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#004D40">
                {type} {title}
            </text>

            {/* 사용자 이름 */}
            {userName && (
                <text x={width/2} y="90" textAnchor="middle" fontSize="18" fill="#004D40">
                    {userName}님의 결과
                </text>
            )}

            {/* 설명 */}
            <foreignObject x="20" y="120" width={width-40} height="100">
                <p xmlns="http://www.w3.org/1999/xhtml"
                   style={{
                       margin: 0,
                       textAlign: 'center',
                       color: '#8D6E63',
                       fontSize: '16px',
                       lineHeight: 1.6
                   }}
                >
                    {description}
                </p>
            </foreignObject>

            {/* 카테고리 */}
            <foreignObject x="20" y="240" width={width-40} height="400">
                <div xmlns="http://www.w3.org/1999/xhtml"
                     style={{
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '8px'
                     }}
                >
                    {categories.map((category, idx) => (
                        <div key={idx} style={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#004D40'
                            }}>
                                {category.title}
                            </h3>
                            <p style={{
                                margin: '4px 0 0',
                                fontSize: '14px',
                                color: '#8D6E63'
                            }}>
                                {category.items.join(' • ')}
                            </p>
                        </div>
                    ))}
                </div>
            </foreignObject>

            {/* 하단 이미지 */}
            {bottomImage && (
                <image
                    href={bottomImage.image_url}
                    x="0"
                    y={height - 130}
                    width={width}
                    height="100"
                    preserveAspectRatio="xMidYMid meet"
                />
            )}

            {/* 로고 */}
            <image
                href="/logo/bk.png"
                x={(width-100)/2}
                y={height - 40}
                width="100"
                height="30"
                opacity="1"
            />
        </svg>
    );
}; 