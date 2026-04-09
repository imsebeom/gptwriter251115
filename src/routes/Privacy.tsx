import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 bg-white">
      <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800">
        ← 돌아가기
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">개인정보 처리방침</h1>
      <p className="text-xs text-slate-500 mb-6">시행일: 2026년 4월 9일</p>

      <div className="prose-coach text-sm space-y-4 leading-relaxed">
        <p>
          <b>GetWriter</b>(이하 "서비스")는 이용자의 개인정보를 중요시하며,{' '}
          「개인정보 보호법」등 관련 법령을 준수하기 위해 노력합니다. 본 방침은 서비스가 수집·이용·보관·파기하는
          개인정보의 항목과 절차를 안내합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">1. 수집하는 개인정보의 항목</h2>
        <p>서비스는 다음과 같은 항목을 수집합니다.</p>
        <ul>
          <li>
            <b>학생(Google 로그인)</b>: 이름, 이메일 주소, Google 계정 식별자, 클래스 초대코드, 소속 클래스 ID, 가입/최근
            접속 일시
          </li>
          <li>
            <b>교사(Google 로그인)</b>: 이름, 이메일 주소, Google 계정 식별자, 생성한 클래스 정보, 가입/최근 접속 일시
          </li>
          <li>
            <b>테스트 사용자(익명 로그인)</b>: 익명 식별자만 수집하며 이름·이메일은 수집하지 않습니다
          </li>
          <li>
            <b>학생 활동 정보</b>: 작성한 글(제목, 본문), 선택한 주제/장르, 문단 수, 좋아요, 댓글, 작성/수정 일시
          </li>
          <li>
            <b>AI 코칭 이력</b>: 코칭 요청 시 AI 서비스(OpenAI)에 전달된 제목·본문·대화 내용
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-6">2. 개인정보의 수집·이용 목적</h2>
        <ul>
          <li>서비스 제공 및 본인 확인(로그인)</li>
          <li>학생-교사 매칭 및 학급(클래스) 운영</li>
          <li>작성 글에 대한 AI 글쓰기 코칭 제공</li>
          <li>학습 활동 기록 및 포트폴리오 PDF 출력</li>
          <li>서비스 품질 개선 및 장애 대응</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">3. 보유 및 이용 기간</h2>
        <p>
          서비스는 이용자의 개인정보를 회원 탈퇴 시 또는 개인정보 수집·이용 목적이 달성된 때까지 보유합니다.
          다만, 관련 법령에 따른 보관 의무가 있는 경우 해당 기간 동안 보관합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">4. 개인정보의 제3자 제공</h2>
        <p>
          서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 AI 코칭 기능 제공을 위해 이용자가
          작성한 글 본문과 대화 내용이 다음과 같이 처리됩니다.
        </p>
        <ul>
          <li>
            <b>제공받는 자</b>: OpenAI, L.L.C. (gpt-5-nano 모델)
          </li>
          <li>
            <b>제공 항목</b>: 글 제목·본문·주제/장르 이름·대화 히스토리
          </li>
          <li>
            <b>이용 목적</b>: AI 글쓰기 코칭 응답 생성
          </li>
          <li>
            <b>보유 및 이용 기간</b>: 요청 처리 시까지 (OpenAI 자체 약관에 따름)
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-6">5. 처리 위탁</h2>
        <p>서비스는 원활한 운영을 위해 다음 업체에 일부 처리 업무를 위탁합니다.</p>
        <ul>
          <li>
            <b>Google LLC</b> (Firebase Authentication, Cloud Firestore, Cloud Functions, Firebase Hosting) — 로그인,
            데이터 저장, 서버 운영
          </li>
          <li>
            <b>OpenAI, L.L.C.</b> — AI 코칭 응답 생성
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-6">6. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 본인의 개인정보에 대해 열람·정정·삭제·처리 정지를 요구할 수 있습니다. 학생의 경우 본인 계정의
          글 삭제, 교사의 경우 본인이 생성한 클래스 및 소속 학생 관리가 가능합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">7. 개인정보 파기 절차 및 방법</h2>
        <p>
          개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 정보는 지체 없이 파기됩니다. 전자적 파일 형태의
          개인정보는 복구할 수 없는 방법으로 영구 삭제됩니다.
        </p>

        <h2 className="text-lg font-bold mt-6">8. 아동의 개인정보 보호</h2>
        <p>
          본 서비스는 초등학교 5학년 학생을 주요 대상으로 하므로, 보호자 및 교사의 지도하에 이용되어야 합니다. 만
          14세 미만 아동의 개인정보 수집 시 법정대리인의 동의가 필요할 수 있으며, 본 서비스는 교육 목적 범위 내에서
          교사 계정을 통해 간접적으로 수집·이용됩니다.
        </p>

        <h2 className="text-lg font-bold mt-6">9. 개인정보 보호 책임자</h2>
        <p>
          개인정보 관련 문의는 서비스를 운영하는 교사 또는 운영자에게 연락해주시기 바랍니다.
        </p>

        <h2 className="text-lg font-bold mt-6">10. 고지의 의무</h2>
        <p>
          본 방침이 변경될 경우 서비스 내 공지사항을 통해 사전 고지합니다.
        </p>
      </div>
    </div>
  );
}
