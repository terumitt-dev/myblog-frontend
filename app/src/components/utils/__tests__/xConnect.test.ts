// app/src/components/utils/__tests__/xConnect.test.ts
import { describe, it, expect } from "vitest";
import {
  isTrustedAuthorizeUrl,
  parseXConnectResult,
  resolveAdminReturnPath,
  X_CONNECT_RESULT_MESSAGES,
} from "../xConnect";

describe("isTrustedAuthorizeUrl", () => {
  it.each([
    "https://twitter.com/i/oauth2/authorize?state=abc",
    "https://x.com/i/oauth2/authorize?state=abc",
    "https://TWITTER.com/i/oauth2/authorize?state=abc",
  ])("許可する: %s", (url) => {
    expect(isTrustedAuthorizeUrl(url)).toBe(true);
  });

  it.each([
    ["別ホスト", "https://evil.example.com/i/oauth2/authorize"],
    ["http", "http://twitter.com/i/oauth2/authorize"],
    ["サブドメイン偽装", "https://twitter.com.evil.example.com/authorize"],
    ["userinfo によるホスト偽装", "https://twitter.com@evil.example.com/authorize"],
    ["認証情報つき", "https://user:pass@twitter.com/authorize"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["プロトコル相対", "//twitter.com/authorize"],
    ["相対パス", "/i/oauth2/authorize"],
    ["空文字", ""],
    ["不正なURL", "not a url"],
  ])("拒否する: %s", (_name, url) => {
    expect(isTrustedAuthorizeUrl(url)).toBe(false);
  });

  it.each([null, undefined, 123, {}, ["https://twitter.com/x"]])(
    "文字列でない値は拒否する: %s",
    (value) => {
      expect(isTrustedAuthorizeUrl(value)).toBe(false);
    },
  );
});

describe("parseXConnectResult", () => {
  it.each(["success", "denied", "error"] as const)("既知の値 %s を受け付ける", (value) => {
    expect(parseXConnectResult(value)).toBe(value);
  });

  it.each([
    null,
    "",
    "SUCCESS",
    "success ",
    "ok",
    "<script>alert(1)</script>",
    "success&x=1",
    "__proto__",
    "constructor",
  ])("未知の値は無視する: %s", (value) => {
    expect(parseXConnectResult(value)).toBeNull();
  });
});

describe("X_CONNECT_RESULT_MESSAGES", () => {
  it("すべての結果に対応する固定メッセージがある", () => {
    expect(X_CONNECT_RESULT_MESSAGES.success.type).toBe("success");
    expect(X_CONNECT_RESULT_MESSAGES.denied.type).toBe("error");
    expect(X_CONNECT_RESULT_MESSAGES.error.type).toBe("error");
  });

  it("失敗メッセージに、連携を始めたブラウザ・5分以内という手がかりを含める", () => {
    expect(X_CONNECT_RESULT_MESSAGES.error.message).toContain("5分以内");
    expect(X_CONNECT_RESULT_MESSAGES.error.message).toContain("連携を始めたブラウザ");
  });
});

describe("resolveAdminReturnPath (ログイン後の遷移先)", () => {
  it.each(["success", "denied", "error"] as const)(
    "/admin?x_connect=%s から来た場合、結果付きの /admin に戻す",
    (result) => {
      expect(resolveAdminReturnPath({ pathname: "/admin", search: `?x_connect=${result}` })).toBe(
        `/admin?x_connect=${result}`,
      );
    },
  );

  it("他のクエリが混ざっていても、既知の x_connect だけを引き継ぎ、他は捨てる", () => {
    expect(
      resolveAdminReturnPath({ pathname: "/admin", search: "?foo=bar&x_connect=success&next=//evil.example" }),
    ).toBe("/admin?x_connect=success");
  });

  it.each([
    ["state なし (通常のログイン)", undefined],
    ["null", null],
    ["文字列", "/admin?x_connect=success"],
    ["数値", 1],
    ["空オブジェクト", {}],
  ])("from が不正・無い場合は /admin: %s", (_name, from) => {
    expect(resolveAdminReturnPath(from)).toBe("/admin");
  });

  it.each([
    ["x_connect が無い", { pathname: "/admin", search: "" }],
    ["未知の x_connect", { pathname: "/admin", search: "?x_connect=hacked" }],
    ["HTML を含む x_connect", { pathname: "/admin", search: "?x_connect=%3Cscript%3E" }],
    ["別のパス", { pathname: "/posts/1", search: "?x_connect=success" }],
    ["/admin 配下の別パス", { pathname: "/admin/secret", search: "?x_connect=success" }],
    ["外部URL風のパス", { pathname: "//evil.example.com", search: "?x_connect=success" }],
    ["パスが文字列でない", { pathname: 1, search: "?x_connect=success" }],
    ["search が文字列でない", { pathname: "/admin", search: { x_connect: "success" } }],
  ])("許可リストに合わない場合は /admin: %s", (_name, from) => {
    expect(resolveAdminReturnPath(from)).toBe("/admin");
  });
});
