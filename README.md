# 🚀 Optimal Cutting Edge (IAM Surgeon)

> **지능형 IAM 권한 분석 및 중첩 그룹 정밀 외과 시뮬레이터**
> 
> GCP IAM 환경의 복잡한 중첩 그룹(Nested Groups) 구조에서 비롯되는 잠재적 권한 과부여 및 우회 상속 취약점을 정밀 발견하고, 업무 다운타임과 부수 피해(Blast Radius)를 최소화하는 최적의 엣지 컷팅 대안을 모의 분석(What-If Simulation)하는 최첨단 보안 솔루션입니다.

---

## 🔗 실시간 라이브 데모 (Live Demo Link)

# 🌐 [https://iam-surgeon-216970054256.asia-northeast3.run.app](https://iam-surgeon-216970054256.asia-northeast3.run.app)

*서울 리전(`asia-northeast3`) 구글 클라우드 런(Cloud Run) 인프라 위에서 보안 HTTPS로 실시간 서비스 중입니다.*

---

## ✨ 핵심 기능 (Key Features)

### 1️⃣ Step-by-Step 가이드 시뮬레이션
- **1. Scan IAM**: GCP IAM 원시 정책 데이터 및 중첩 그룹 관계를 스캔하여 잠재적 보안 취약 경로를 실시간 발견합니다.
- **2. Find Optimal Cut**: 업무Disruption을 최소화하는 수학적 비용 모델 기반의 최적의 우회로 격리 방안을 탐색합니다.
- **3. Apply Simulation**: 최종 대안을 확정 인가하여 Gemini 인공지능이 생성한 정밀 대안 해석(Justification)과 gcloud CLI/Terraform 자동 배포 스크립트를 도출합니다.

### 2️⃣ 실시간 프리뷰 및 다이내믹 원형 게이지 스코어카드
- 최종 적용(Apply) 전에 **Candidate A, B, C 대안을 자유롭게 클릭**하며 다이어그램에서 실시간 빨간색 절선(Edge Cut)을 안전하게 모의 관찰합니다.
- 대안 선택에 따라 좌측의 **`GCP IAM SECURITY HEALTH` 게이지 스코어와 예견 손실 사용자(Disrupted Users) 수치가 실시간 34% ➡️ 100% ➡️ 80%로 다이내믹 연동**되어 직관적인 데이터 기반 결정을 도울 수 있습니다.

### 3️⃣ 자연어 정책 컴파일러 (NLP Policy Compiler)
- 자연어로 클라우드 보안 정책을 입력하면(e.g., *"Keep dev environment, block production deletion"*), 제미나이가 이를 해석하여 **클라우드 제약 조건 AST 구조(ASSERT 구문)로 실시간 컴파일**하고 최적의 후보군 대안을 자동 정렬(Auto Re-sorting) 및 추천해 줍니다.

### 4️⃣ 고급 3열 테크니컬 피드백 패널
- **AI Reasoning Justification**: 왜 이 대안이 최소 피해의 최선책인지 제미나이 엔진이 생성한 고도의 한글 보충 설명을 브리핑합니다.
- **gcloud Commands**: 즉각 터미널에 복사-붙여넣기 할 수 있는 실제 보안 조치용 `gcloud CLI` 명령어 세트를 출력합니다.
- **Terraform Configuration**: 코드형 인프라(IaC)로 형상 관리할 수 있는 고품질 선언적 `Terraform` 코드를 생성해 줍니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: Next.js, React, TypeScript, Lucide Icons
- **Visual Graph**: React Flow (고성능 SVG 렌더링 기반 대화형 클라우드 맵)
- **AI Engine**: Google Gemini Pro (심층 추론 및 자연어 정책 컴파일링)
- **Styling**: Premium Glassmorphism UI (Vanilla CSS + Dynamic CSS Variables)
- **Deployment**: Google Cloud Run (serverless container)

---

## 🏃‍♂️ 로컬 개발 환경 실행 (Local Development)

프로젝트를 내 로컬 환경에서 가동하려면 아래 순서를 따르세요.

```bash
# 1. 패키지 설치
npm install

# 2. 로컬 개발 서버 기동
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 결과를 실시간으로 확인하실 수 있습니다.
