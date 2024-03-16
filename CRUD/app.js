// 모듈 추가
const fs = require("fs"); //html 읽기위해 사용
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cheerio = require("cheerio");

const app = express();

// 저장되어있는 회원아이디, 비번
const users = [
  { id: "lsp", password: "1234" },
  { id: "qwer", password: "5678" }
];

/* 포트 설정 */
app.set('port', process.env.PORT || 8080);

/* 공통 미들웨어 */
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(cookieParser('secret@1234')); // 암호화된 쿠키를 사용하기 위한 임의의 문자 전송
app.use(session({
  secret: 'secret@1234', // 암호화
  resave: false, // 새로운 요청시 세션에 변동 사항이 없어도 다시 저장할지 설정
  saveUninitialized: true, // 세션에 저장할 내용이 없어도 저장할지 설정
  cookie: { // 세션 쿠키 옵션 들 설정 httpOnly, expires, domain, path, secure, sameSite
    httpOnly: true, // 로그인 구현시 필수 적용, javascript로 접근 할 수 없게 하는 기능
  },
  name: 'connect.sid' // 세션 쿠키의 Name지정 default가 connect.sid
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//============================================================================
//                    로그인
//============================================================================
/* 라우팅 설정 */
app.get('/', (req, res) => {
  if (req.session.name) { // 세션을 확인해 true값이라면 로그인 허락
    const output = `  
                <body style="background-color: #202124; color:#9AB4F2">
                <h2>로그인한 사용자님</h2>
                <p>${req.session.name}님 안녕하세요.</p>
                <form action="/logout" method="get"><button type="submit">로그아웃</button></form>
                <button type="button" onclick="redirectTo('/concert')">행사일정 보기(API 사용)</button>
                <button type="button" onclick="redirectTo('/crawling')">오늘의 공연(crawling 사용)</button>
                <button type="button" onclick="redirectTo('/todolist')">ToDoList</button>
                </body>
                
                <style>
                button {
                  padding: 10px 20px;
                  margin: 5px;
                  background-color: #007bff;
                  color: #ffffff;
                }
                </style>

                <script>
                function redirectTo(path) {
                  window.location.href = path;
                }
                </script>
            `
    res.send(output);

  } else { // 세션값이 false라면 로그인 불가
    const output = `  
                <body style="background-color: #202124; color:#9AB4F2">
                <h2>로그인하지 않은 사용자입니다.</h2>
                <p>로그인 해주세요.</p>  
                <form action="/login" method="get">
                <button type="submit">로그인 하러가기</button></form>
                </body>

                <style>
                button {
                  padding: 10px 20px;
                  margin: 5px;
                  background-color: #007bff;
                  color: #ffffff;
                }
                </style>
            `
    res.send(output);
  }
});

// login 경로에 get요청이 들어온다면 login.html 파일의 내용을 읽어와서 응답으로 전송 
app.get('/login', function (request, response) {

  fs.readFile('public/login.html', function (error, data) {
    if (error) {
      return response.status(500).send('로그인 페이지를 불러오는 중 오류가 발생했습니다.');
    }
    //파일을 문자열로 변경하여 전달해야하므로 data.toString() 메서드가 필요험
    response.send(data.toString());
  });
});

// login 경로로 POST 요청이 들어온다면 처리하는 부분.
// 클라이언트에서 서버로 데이터를 전달해야하므로 POST 메서드 사용
app.post('/login', function (request, response) {
  // request.body는 POST 요청의 바디를 파싱하여 가져온다. 따라서 클라이언트에서 제출한 로그인과 패스워드를 가져온다.
  var login = request.body.login;
  var password = request.body.password;

  // users의 객체배열에 존재하는 아이디와 비번이 클라이언트가 제출한 아이디와 비밀번호가 매칭된다면 true, 없다면 false
  const user = users.find(user => user.id == login && user.password == password);

  if (user) {
    // 로그인 성공
    request.session.name = user.id; // 세션에 사용자 정보 저장
    response.redirect('/');
  } else {
    // 로그인 실패
    console.log("로그인 실패");
    response.redirect('/login');
  }

});

// 회원가입 처리
app.post('/signup', (req, res) => {
  // post 요청으로 클라이언트에서 전송된 데이터를 받아오는 부분
  //body에서 id와 password를 추출한다
  const { id, password } = req.body;

  // 사용자가 이미 존재하는지 확인
  // id가 같은 사용자가 존재하면 ture, 없다면 false
  const userExists = users.some(user => user.id == id);

  if (userExists) {
    res.status(400).send('이미 동일한 아이디가 존재합니다.');
  } else {
    // 새로운 사용자 생성
    const newUser = { id, password };
    users.push(newUser);
    console.log("회원가입 성공");
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('connect.sid'); //클라이언트 측에서만 작동하며, 클라이언트의 브라우저에 저장된 쿠키를 삭제
  req.session.destroy(); //서버 측에서 작동하며, 서버의 메모리나 데이터베이스에 저장된 세션 데이터를 삭제
  res.redirect('/');

});

//============================================================================
//                    행사 API
//============================================================================
/* 라우팅 설정 */
app.get('/concert', async (req, res) => {

  if (!req.session.name) {
    return res.redirect('/login'); // 로그인 페이지로 리다이렉트
  }

  // month에 쿼리스트링으로 데이터를 정수형태로 변환해서 가져온다.
  let month = parseInt(req.query.month, 10);

  const serviceKey = "bmDxI%2F3KJw7bCGRhEHG%2F3wiUzRAy5FJ0%2BUJwAXV%2BQpXSuQSs4MwYaDw8iBnhKtrsLUtyD3dxsFZ%2FVAiSTiSyFg%3D%3D";
  //요청주소
  const reqUrl = "http://apis.data.go.kr/6300000/eventDataService/eventDataListJson?";

  let parmas = encodeURI('serviceKey') + '=' + serviceKey; //인증키
  parmas += '&' + encodeURI('pageNo') + '=' + encodeURI('1'); // 페이지번호
  parmas += '&' + encodeURI('numOfRows') + '=' + encodeURI('1000') // 페이지당 레코드 수, 가져올 데이터 1000개


  const url = reqUrl + parmas;

  try {
    const result = await axios.get(url); // axios.get의 응답이 있으면 async를 실행하겠다.

    const concert = {
      location: "대전광역시", // 지역

    }

    const currentDate = new Date(); // 날짜 가져오기
    currentMonth = currentDate.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더해줍니다.
    const currentYear = currentDate.getFullYear(); // 년도

    // 쿼리스트링으로 데이터를 받아왔을 때(원하는 month의 데이터를 보고싶을때 사용)
    if (month <= "12" && month >= "1") {
      currentMonth = month;
    }
    
    // 1월~9월은 01~09 이런식으로 월을 필터해야하므로 padStart를 사용해 2자리로 만들어준다.
    const formattedMonth = currentMonth.toString().padStart(2, '0');

    const concertData = result.data.msgBody; // concertData는 공공데이터 포털에서 openAPI인 대전광역시 공연행사정보 데이터를 가져옴
    // 필터데이터 = concertData에서 beginDt(시작날짜)가 현재년도-현재월에 해당하는 데이터를 뽑아 시작일, 타이틀명, 테마명, 종료일을 가져옵니다.
    const filteredData = concertData.filter(item => item.beginDt.startsWith(currentYear + "-" + formattedMonth)).map(item => {
      return {
        beginDt: item.beginDt, //시작일
        title: item.title, //타이틀명
        themeCdNm: item.themeCdNm, //테마명
        endDt: item.endDt //종료일
      };
    });

    if (filteredData.length > 0) { // 필터된 데이터가 있다면 출력

      //${filteredData.map(item => `...`) 필터된 데이터배열의 각 요소를 순회하면서 해당 요소를 item으로 받아와 추출하여 리스트 형태로 표시
      const responseString = `<body style="background-color: #202124; color:#9AB4F2">
                              <h2>${concert.location}에서 주최하는 <b>${currentMonth}월</b> 계획된 공연은 </h2> 
                              
                              ${filteredData.map(item => `<li>${item.beginDt} / 행사명 : ${item.title} / 테마명 : ${item.themeCdNm} / 종료일 : ${item.endDt}</li>`).join('<br>')} <br><br>가 있습니다.<br>

                              <form action="/" method="get"><button type="submit">이전으로 돌아가기</button></form>
                            
                              </body>

                              <style>
                              button {
                                padding: 10px 20px;
                                margin: 5px;
                                background-color: #007bff;
                                color: #ffffff;
                              }
                              </style>
`;
      res.send(responseString);
    } else { // 없다면 출력
      res.send(`
      <body style="background-color: #202124; color:#9AB4F2">
      2023년 ${currentMonth}월 계획된 공연이 없습니다.<br>
      <form action="/" method="get"><button type="submit">이전으로 돌아가기</button></form>
      </body>

      <style>
      button {
        padding: 10px 20px;
        margin: 5px;
        background-color: #007bff;
        color: #ffffff;
      }
      </style>
      `);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('서버 에러: ' + error.message);
  }
});

//============================================================================
//                    크롤링
//============================================================================
app.get('/crawling', async (req, res) => {

  if (!req.session.name) {
    return res.redirect('/login'); // 로그인 페이지로 리다이렉트
  }

  try { // 문화체육관광부 - 문화예술공연의 오늘의 공연 크롤링
    //해당 url의 페이지를 가져옴
    const html = await axios.get("https://www.mcst.go.kr/kor/s_culture/culture/cultureList.jsp?pSeq=&pRo=&pCurrentPage=1&pType=&pPeriod=&fromDt=&toDt=&pArea=&pSearchType=01&pSearchWord=");
    const ulList = [];
    // cheerio 라이브러리를 사용해 html 로드.
    const $ = cheerio.load(html.data);
    // html에서 div태그 중 class가 today-swiperWrap요소안에 ul의 자식중 li요소들을 선택
    const $bodyList = $("div.today-swiperWrap ul").children("li"); // div 태그의 class가 today-swiperWrap안의 ul의 li를 가져옴
    
    $bodyList.each(function (i, elem) {
      // 이미지 경로 저장
      const imgSrc = $(this).find('img').attr('src');
      // 이미지 경로를 전체 URL로 변환
      const fullImgSrc = `https://www.mcst.go.kr${imgSrc}`;
      // 배열에 객체 추가
      ulList[i] = {
        // 현재 순회중인 li요소 내부에 strong태그를 찾아 내용을 저장
        performanceName: $(this).find('strong'),
        // li요소 내부에 a 태그를 찾아 해당태그의 href 속성값을 저장
        url: $(this).find('a').attr('href'),
        // 이미지 경로를 picture 속성에 저장
        picture: fullImgSrc
      };
    });
    //#content > div.contentWrap > div.today-swiperWrap > div > ul > li.swiper-slide.swiper-slide-active > a 공연이름
    //#content > div.contentWrap > div.today-swiperWrap > div > ul > li.swiper-slide.swiper-slide-active > a > div > img 공연링크
    //#content > div.contentWrap > div.today-swiperWrap > div > ul > li.swiper-slide.swiper-slide-active > a > span > strong 공연사진
    
    // data = ulList에 title(performanceName) 속성이 존재하는 객체들만 추려내 data 배열에 저장
    const data = ulList.filter(n => n.performanceName);
    // 데이터가 없다면 출력
    if (data.length == 0) {
      return res.send('오늘의 공연 데이터가 없습니다.');
    }

    let responseString = `
                          <body style="background-color: #202124; color:#9AB4F2">
                          <h1>[문화체육관광부 문화예술공연] 오늘의 공연 데이터 크롤링</h1>                       
                          `;

    data.forEach(item => { // 데이터 배열에 해당 item의 정보를 html 요소로 만들어 responseString에 계속 누적
      responseString += `<div style="display: flex; align-items: center;">
                          <a href= https://www.mcst.go.kr/${item.url}>
                          <img src="${item.picture}" style="width:150px; height:150px; border: 5px solid black">
                          </a>
                          <div style="margin-left: 10px; font-size:20px"> : ${item.performanceName}</div>
                           </div><br><br></body>`;
    });
   
    res.send(responseString);

  } catch (error) {
    console.error(error);
    res.status(500).send('서버 에러: ' + error.message);
  }
});


//============================================================================
//                    CRUD : to do list
//============================================================================

let todoList = [];
let numOfBoard = 0;

app.get('/todolist', (req, res) => {
  try {
    if (!req.session.name) {
      return res.redirect('/login'); // 로그인 페이지로 리다이렉트
    }
    // todolist배열을 순회하면서 각 요소를 가공해 새로운 배열에 담아 반환
    const formattedBoardList = todoList.map(board => {
      const { id, user_id, date, deadline, content } = board;
      return `<b>작성자</b> : ${user_id} / <b>할일</b> : ${content} / <b>작성일</b> : ${date} / <b>마감기간</b> : ${deadline}<br>`;
    });
    // todoList 배열을 읽기 쉬운 JSON 형식의 문자열로 변환합니다. null은 replacer 함수를 지정하지 않는 것이며, 2는 들여쓰기 수를 나타냄
    res.send(`<body style="background-color: #202124; color:#9AB4F2">
              <h1>To Do list <br></h1>` + formattedBoardList.join('\n') + `<br>` + JSON.stringify(todoList, null, 2) + `</body>`);


  } catch (error) {
    res.status(500).send('서버 에러: ' + error.message);
  }
});

// CRUD의 Create에 해당
app.post('/todolist', (req, res) => {
  try {
    const board = {
      "id": ++numOfBoard, //순번을 나타냄
      "user_id": req.body.user_id, // 작성자를 나타냄
      "date": new Date(), // 작성일자를 나타냄
      "deadline": req.body.deadline, // 언제까지인지 기간을 나타냄
      "content": req.body.content // 내용을 나타냄
    };
    todoList.push(board);

    res.redirect('/todolist');
  } catch (error) {
    console.error(error);
    res.status(500).send('서버 에러: ' + error.message);
  }
});

// id를 적으면 id에 해당하는 데이터를 수정한다.
app.put('/todolist/:id', (req, res) => {
  try {
    // req.params.id 값 찾아 리스트에서 삭제
    const findItem = todoList.find((item) => {
      return item.id == +req.params.id
    });
    if (findItem) {
      //findItem을 찾아 그 인덱스를 저장
      const idx = todoList.indexOf(findItem);
      //idx 위치에 있는요소 1개 제거
      todoList.splice(idx, 1);

      // 리스트에 새로운 요소 추가
      const board = {
        "id": +req.params.id,
        "user_id": req.body.user_id,
        "date": new Date(),
        "deadline": req.body.deadline,
        "content": req.body.content
      };
      todoList.push(board);

      res.redirect('/todolist');
    } else {
      throw new Error('항목을 찾을 수 없습니다.'); // 예외 발생
    }
  } catch (error) {
    res.status(500).send('서버 에러: ' + error.message);
  }
});

// id를 적으면 id에 해당하는 데이터를 삭제한다.
app.delete('/todolist/:id', (req, res) => {
  try {
    // req.params.id 값 찾아 리스트에서 삭제
    const findItem = todoList.find((item) => {
      return item.id == +req.params.id
    });

    if (findItem) {
      const idx = todoList.indexOf(findItem);
      todoList.splice(idx, 1);
    } else {
      throw new Error('항목을 찾을 수 없습니다.'); // 예외 발생
    }

    res.redirect('/todolist');
  } catch (error) {
    res.status(500).send('서버 에러: ' + error.message);
  }
});


/* 서버와 포트 연결.. */
app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번 포트에서 서버 실행 중 ..')
});


