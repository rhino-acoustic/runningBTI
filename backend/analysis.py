# 기계학습을 활용한 심화 분석
def analyze_personality(answers):
    # 기본 유형 매칭
    base_type = calculate_base_type(answers)
    
    # 머신러닝 모델 적용 (사전 학습된 모델 사용)
    ml_analysis = load_model('personality_model.h5').predict(answers)
    
    # 혼합 유형 생성 알고리즘
    if ml_analysis.confidence < 0.7:
        return generate_hybrid_type(base_type, ml_analysis)
    return base_type 