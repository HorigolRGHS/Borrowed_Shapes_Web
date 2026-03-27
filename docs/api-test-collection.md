# API Test Collection — borrowed-shapes-wiki backend
# Base URL: http://localhost:3001/api
# Import vào Postman/Insomnia/Thunder Client hoặc chạy trực tiếp bằng curl

---

## ─── VARIABLES ──────────────────────────────────────────
# Sau khi login thành công, copy accessToken và thay vào ACCESS_TOKEN bên dưới
BASE=http://localhost:3001/api
ACCESS_TOKEN=<paste_access_token_here>
REFRESH_TOKEN=<paste_refresh_token_here>

---

## ─── 1. AUTH ─────────────────────────────────────────────

### 1.1 Register (tạo tài khoản mới)
```
POST /api/auth/register
```
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "Password123!",
    "displayName": "player1",
    "deviceInfo": "curl-test/1.0"
  }'
```
**Expected:** `201 Created`
```json
{
  "userId": "clxxxxxxxx",
  "email": "player1@example.com",
  "displayName": "player1",
  "role": "USER"
}
```

---

### 1.2 Register — email đã tồn tại (lỗi)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "Password123!"
  }'
```
**Expected:** `409 Conflict`
```json
{ "message": "Email already in use", "error": "Conflict", "statusCode": 409 }
```

---

### 1.3 Register — validation error
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "email": "not-an-email", "password": "short" }'
```
**Expected:** `400 Bad Request`

---

### 1.4 Login (forum — browser client)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "Password123!",
    "platform": "forum",
    "deviceInfo": "Mozilla/5.0 Chrome/120"
  }'
```
**Expected:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "clxxxxxxxx:forum:yyyyyyyyyyyyyyyyyyyyyyyy",
  "expiresIn": 900,
  "expiresAt": "2026-03-25T11:07:00.000Z",
  "user": {
    "id": "clxxxxxxxx",
    "displayName": "player1",
    "role": "USER"
  }
}
```
> **Lưu `accessToken` vào `ACCESS_TOKEN` và `refreshToken` vào `REFRESH_TOKEN` để dùng cho các request tiếp theo**

> **JWT payload** (decoded): `{ sub: userId, role, platform, iat, exp }` — dùng để xác thực mỗi request qua header `Authorization: Bearer <accessToken>`

---

### 1.5 Login (game — Unity client)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "Password123!",
    "platform": "game",
    "deviceInfo": "UnityPlayer/2022.3"
  }'
```
**Expected:** `200 OK` — trả về accessToken mới (session riêng biệt với forum)

---

### 1.6 Login — sai mật khẩu
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "player1@example.com",
    "password": "WrongPassword",
    "platform": "forum"
  }'
```
**Expected:** `401 Unauthorized`

---

### 1.7 Refresh token (lấy accessToken mới)
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'$REFRESH_TOKEN'"
  }'
```
**Expected:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "clxxxxxxxx:forum:zzzzzzzzzzzzzzzzzzzzzzzz",
  "expiresIn": 900
}
```
> **Lưu ý:** Refresh token xoay vòng (rotate) — mỗi lần refresh sẽ nhận được cặp token mới. Token cũ bị vô hiệu ngay lập tức.

---

### 1.8 Logout
```bash
curl -X DELETE http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `204 No Content`

---

### 1.9 Request sau logout (token không hợp lệ)
```bash
curl -X GET http://localhost:3001/api/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `401 Unauthorized`

---

## ─── 2. SESSIONS ─────────────────────────────────────────

> **Yêu cầu:** Login trước, lưu accessToken vào ACCESS_TOKEN

### 2.1 GET /sessions/me — thông tin session hiện tại
```bash
curl -X GET http://localhost:3001/api/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `200 OK`
```json
{
  "sessionId": "xxxxxxxx",
  "userId": "clxxxxxxxx",
  "role": "USER",
  "platform": "forum",
  "lastActive": "2026-03-18T11:30:00.000Z",
  "deviceInfo": "Mozilla/5.0"
}
```

---

### 2.2 PUT /sessions/me — heartbeat (cập nhật lastActive)
```bash
curl -X PUT http://localhost:3001/api/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `204 No Content`

> Gọi lại ngay sau đó để kiểm tra lastActive được cập nhật:
```bash
curl -X GET http://localhost:3001/api/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 2.3 GET /sessions — danh sách tất cả sessions của user
```bash
curl -X GET http://localhost:3001/api/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `200 OK`
```json
[
  {
    "id": "db-record-id",
    "sessionId": "xxxxxxxx",
    "loginTime": "2026-03-18T11:00:00.000Z",
    "logoutTime": null,
    "deviceInfo": "Mozilla/5.0",
    "ipAddress": "127.0.0.1",
    "status": "ACTIVE",
    "isActive": true,
    "isCurrent": true,
    "lastActive": "2026-03-18T11:30:00.000Z",
    "platform": "forum"
  }
]
```

---

### 2.4 DELETE /sessions/:id — revoke một session cụ thể
> Lấy `id` (db record id) từ response của GET /sessions

```bash
# Thay DB_SESSION_ID bằng id từ GET /sessions
curl -X DELETE http://localhost:3001/api/sessions/<DB_SESSION_ID> \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Expected:** `204 No Content`

---

### 2.5 Không có Authorization header
```bash
curl -X GET http://localhost:3001/api/sessions/me
```
**Expected:** `401 Unauthorized`
```json
{ "message": "Unauthorized", "statusCode": 401 }
```

---

## ─── 3. FULL FLOW SCRIPT ─────────────────────────────────

### Chạy toàn bộ flow trong 1 lần (bash)

```bash
#!/bin/bash
BASE="http://localhost:3001/api"
EMAIL="smoketest_$(date +%s)@example.com"

echo "=== 1. Register ==="
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password123!\",\"displayName\":\"smoketest\"}" | jq .

echo -e "\n=== 2. Login ==="
LOGIN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Password123!\",\"platform\":\"forum\"}")
echo $LOGIN | jq .
ACCESS_TOKEN=$(echo $LOGIN | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN | jq -r '.refreshToken')
echo "Access Token: $ACCESS_TOKEN"

echo -e "\n=== 3. GET /sessions/me ==="
curl -s -X GET $BASE/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n=== 4. Heartbeat ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -X PUT $BASE/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n=== 5. List sessions ==="
SESSIONS=$(curl -s -X GET $BASE/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo $SESSIONS | jq .

echo -e "\n=== 6. Refresh token ==="
REFRESH=$(curl -s -X POST $BASE/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo $REFRESH | jq .
ACCESS_TOKEN=$(echo $REFRESH | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $REFRESH | jq -r '.refreshToken')
echo "New Access Token: $ACCESS_TOKEN"

echo -e "\n=== 7. Logout ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  -X DELETE $BASE/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo -e "\n=== 8. Access after logout (expect 401) ==="
curl -s -X GET $BASE/sessions/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\nDone!"
```

---

## ─── 4. POSTMAN / THUNDER CLIENT ────────────────────────

Tạo **environment variable** `ACCESS_TOKEN` và dùng trong Authorization header:
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

Sau khi gọi Login, dùng **Test script** để tự động lưu:
```javascript
// Postman test tab
const data = pm.response.json();
pm.environment.set("ACCESS_TOKEN", data.accessToken);
pm.environment.set("REFRESH_TOKEN", data.refreshToken);
```

Sau khi gọi Refresh, dùng **Test script** để cập nhật token:
```javascript
// Postman test tab (Refresh endpoint)
const data = pm.response.json();
pm.environment.set("ACCESS_TOKEN", data.accessToken);
pm.environment.set("REFRESH_TOKEN", data.refreshToken);
```

---

## ─── 5. ENDPOINTS SUMMARY ───────────────────────────────

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/register` | ❌ | Tạo tài khoản |
| POST | `/api/auth/login` | ❌ | Đăng nhập, trả accessToken + refreshToken |
| POST | `/api/auth/refresh` | ❌ | Làm mới accessToken bằng refreshToken (token rotation) |
| DELETE | `/api/auth/logout` | ✅ | Đăng xuất session hiện tại |
| GET | `/api/sessions/me` | ✅ | Thông tin session đang dùng |
| PUT | `/api/sessions/me` | ✅ | Heartbeat — reset TTL presence |
| GET | `/api/sessions` | ✅ | Danh sách tất cả sessions của user |
| DELETE | `/api/sessions/:id` | ✅ | Revoke một session cụ thể |

---

## ─── 6. TOKEN STRUCTURE ─────────────────────────────────

### Access Token (JWT)
Short-lived (15 phút). Gửi kèm mỗi request qua header `Authorization: Bearer <token>`.

**Payload (decoded):**
```json
{
  "sub": "clxxxxxxxx",
  "role": "USER",
  "platform": "forum",
  "iat": 1774108736,
  "exp": 1774109636
}
```

### Refresh Token
Long-lived (7 ngày). Dạng opaque string: `{userId}:{platform}:{sessionId}`.
Dùng duy nhất cho endpoint `POST /api/auth/refresh`. Xoay vòng sau mỗi lần dùng.

### Login Response
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<userId>:<platform>:<sessionId>",
  "expiresIn": 900,
  "expiresAt": "2026-03-25T11:07:00.000Z",
  "user": {
    "id": "clxxxxxxxx",
    "displayName": "player1",
    "role": "USER"
  }
}
```
> `expiresIn`: TTL của accessToken tính bằng giây
> `expiresAt`: thời điểm hết hạn của **session** (refresh token), định dạng ISO 8601
