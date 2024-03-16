# CRUD-practice

# 보고서

이 작품은 로그인, API 호출, 웹 크롤링, CRUD 기능을 구현한 연습 프로젝트 입니다.

# 실행 방법

CRUD cmd -> node app.js

크롬 - http://127.0.0.1:8080/

# 로그인

라우팅 설정 : ‘/’ 경로로 GET 요청이 들어왔을 때의 처리입니다. 세션을 확인하여 로그인 상태에 따라 다른 화면을 보여줍니다.
app.get('/', (req, res) => {
  // ...
});

# 로그인 처리
: ‘/login’ 경로로 POST 요청이 들어왔을 때의 처리입니다. 클라이언트로부터 로그인 정보를 받아와서 유효성을 검사한 후 세션에 사용자 정보를 저장합니다.
app.post('/login', function (request, response) {
  // ...
});

# 회원가입 처리
: ‘/signup’ 경로로 POST 요청이 들어왔을 때의 처리입니다. 새로운 사용자를 생성하고 기존 사용자와 중복되는지 확인합니다.
app.post('/signup', (req, res) => {
  // ...
});

# 로그아웃
: ‘/logout’ 경로로 GET 요청이 들어왔을 때의 처리입니다. 세션을 종료하고 홈 화면으로 리다이렉트합니다.
app.get('/logout', (req, res) => {
  // ...
});

# 행사 API
: ‘/concert’ 경로로 GET 요청이 들어왔을 때의 처리입니다. 공공 데이터 포털의 대전광역시 공연 정보를 가져와서 현재 월의 공연을 필터링하여 보여줍니다. 만약 쿼리스트링으로 month를 지정해준다면 해당 month에 정보를 보여줍니다.
app.get('/concert', async (req, res) => {
  // ...
});

# 크롤링
: ‘/crawling’ 경로로 GET 요청이 들어왔을 때의 처리입니다. 문화체육관광부의 오늘의 공연 정보를 크롤링하여 화면에 보여줍니다.
app.get('/crawling', async (req, res) => {
  // ...
});

# CRUD: To Do List
: ‘/todolist’ 경로로 GET, POST, PUT, DELETE 요청이 들어왔을 때의 처리입니다. To Do List의 생성, 읽기, 수정, 삭제를 담당합니다.
app.get('/todolist', (req, res) => {
  // ...
});
app.post('/todolist', (req, res) => {
  // ...
});
app.put('/todolist/:id', (req, res) => {
  // ...
});
app.delete('/todolist/:id', (req, res) => {
  // ...
});

## API 기능과 웹 크롤링 할 때 썻던 사이트
공공데이터포털 : [대전광역시 공연행사정보]
  - https://www.data.go.kr/
문화체육관광부 : [오늘의 공연]
  - https://www.mcst.go.kr/kor/s_culture/culture/cultureList.jsp

