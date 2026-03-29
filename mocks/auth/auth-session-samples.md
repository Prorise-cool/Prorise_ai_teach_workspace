# Story 1.1 认证 mock 样例

## 登录成功

```json
{
  "code": 200,
  "msg": "登录成功",
  "data": {
    "access_token": "mock-auth-student-access-token",
    "refresh_token": "mock-auth-student-refresh-token",
    "expire_in": 7200,
    "refresh_expire_in": 604800,
    "client_id": "student-web",
    "openid": "student-open-id",
    "scope": "openid profile"
  }
}
```

## 当前用户

```json
{
  "code": 200,
  "msg": "获取成功",
  "data": {
    "user": {
      "userId": "10001",
      "userName": "student_demo",
      "nickName": "小麦同学",
      "avatar": "https://static.prorise.test/avatar/student.png",
      "roles": [
        {
          "roleId": "20001",
          "roleKey": "student",
          "roleName": "学生"
        }
      ]
    },
    "roles": ["student"],
    "permissions": [
      "video:task:add",
      "classroom:session:add"
    ]
  }
}
```

## 未登录

```json
{
  "code": 401,
  "msg": "当前会话已失效，请重新登录",
  "data": null
}
```

## 权限不足

```json
{
  "code": 403,
  "msg": "当前账号暂无小麦学生端访问权限",
  "data": null
}
```
