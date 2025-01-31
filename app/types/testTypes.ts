// 테스트 데이터 타입 정의
export interface TestData {
  meta: {
    title: string;
    description: string;
    version: string;
    created: string;
  };
  content: {
    questions: Question[];
    results: Result[];
  };
  analytics: {
    participants: number;
    shares: number;
    completionRate: number;
  };
}

interface Question {
  id: string;
  text: string;
  answers: Answer[];
  weight: number;
}

interface Answer {
  id: string;
  text: string;
  type: string;
  score: number;
}

interface Result {
  type: string;
  title: string;
  description: string;
  image: string;
  detail: string;
} 