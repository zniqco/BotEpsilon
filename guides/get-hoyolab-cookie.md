# 쿠키 가져오는 방법

1. https://genshin.hoyoverse.com/ko/gift 또는 https://hsr.hoyoverse.com/gift 에 접속합니다. (아무 게임의 페이지나 상관없음)

2. 로그인을 합니다.

3. F12를 눌러 콘솔을 열고 `document.cookie`를 입력하여 쿠키 값을 출력한 뒤,
   **양끝의 ' 기호를 제외한 값**을 복사합니다.![참고 이미지](get-hoyolab-cookie-console.png)

4. 너무 길어서 다 입력할 수 없는 경우, `document.cookie.split(";").map(e=>e.trim()).reduce((e,i)=>(/(ltoken|ltuid)=/.test(i)&&(e+=i+";"),e),"")` 를 입력하여 필터링 된 쿠키 값을 확인해보세요.