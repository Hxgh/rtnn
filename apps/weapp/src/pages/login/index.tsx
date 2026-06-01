import { Input, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import type { CustomerLoginBody } from "@rtnn/api-sdk";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { goToHome } from "../../lib/navigation";
import { getSdkClient } from "../../lib/sdk/client";
import { authSession } from "../../lib/session/auth";
import { getWeappMessages } from "../../lib/i18n";
import { resolveWeappErrorMessage } from "../../lib/errors";
import { useState } from "react";
import "./index.css";

const initialCredentials: {
  email: string;
  password: string;
} = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messages = getWeappMessages();

  useDidShow(() => {
    authSession
      .restoreSession()
      .then((session) => {
        if (session) {
          goToHome();
        }
      })
      .catch(() => {
        setErrorMessage(messages.login.errorSessionUnavailable);
      });
  });

  const handleLogin = async () => {
    if (submitting) {
      return;
    }

    if (!credentials.email || !credentials.password) {
      setErrorMessage(messages.login.errorRequired);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    const client = getSdkClient();
    const payload: CustomerLoginBody = {
      email: credentials.email,
      password: credentials.password,
    };

    try {
      const session = await client.auth.customer.login(payload);
      authSession.applySession(session);
      const restored = await authSession.restoreSession();
      if (!restored) {
        throw new Error("session restore failed");
      }
      goToHome();
    } catch (error) {
      setErrorMessage(
        resolveWeappErrorMessage(error) || messages.login.errorInvalid,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="safe-page safe-page--auth page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">{messages.login.title}</Text>
        <Text className="page-desc">{messages.login.description}</Text>
      </View>

      <View className="card card-section login-page__form">
        <View className="login-page__intro stack-sm">
          <Text className="login-page__intro-title">
            {messages.login.introTitle}
          </Text>
          <Text className="helper-text">{messages.login.introDescription}</Text>
        </View>

        <View className="login-page__credentials">
          <View className="stack-sm">
            <Text className="field-label">{messages.login.email}</Text>
            <Input
              className="field-input"
              data-testid="login-email-input"
              value={credentials.email}
              placeholder={messages.login.emailPlaceholder}
              onInput={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  email: event.detail.value ?? "",
                }))
              }
            />
          </View>
          <View className="stack-sm">
            <Text className="field-label">{messages.login.password}</Text>
            <Input
              className="field-input"
              data-testid="login-password-input"
              value={credentials.password}
              placeholder={messages.login.passwordPlaceholder}
              password
              onInput={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: event.detail.value ?? "",
                }))
              }
            />
          </View>
        </View>

        {errorMessage ? (
          <View className="message-box message-box--error">{errorMessage}</View>
        ) : (
          <Text className="helper-text">{messages.login.introDescription}</Text>
        )}

        <View className="weapp-action-group">
          <View
            data-testid="login-submit-action"
            className={
              submitting
                ? "weapp-button weapp-button--primary weapp-button--disabled"
                : "weapp-button weapp-button--primary"
            }
            onClick={handleLogin}
          >
            {submitting ? messages.login.submitting : messages.login.submit}
          </View>
          <View
            data-testid="login-home-action"
            className="weapp-button weapp-button--ghost"
            onClick={() => {
              void goToHome();
            }}
          >
            {messages.login.backHome}
          </View>
        </View>
      </View>
    </View>
  );
}
