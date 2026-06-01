import { Navigator, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import type { CustomerMeResult } from "@rtnn/api-sdk";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { useState } from "react";
import { getWeappMessages } from "../../lib/i18n";
import { resolveWeappErrorMessage } from "../../lib/errors";
import { authSession } from "../../lib/session/auth";
import "./index.css";

type HomeState =
  | {
      status: "loading";
    }
  | {
      status: "guest";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "authenticated";
      profile: CustomerMeResult["user"];
    };

export default function IndexPage() {
  const [state, setState] = useState<HomeState>({
    status: "loading",
  });
  const messages = getWeappMessages();

  useDidShow(() => {
    setState({ status: "loading" });

    authSession
      .restoreSession()
      .then((session) => {
        if (!session) {
          setState({ status: "guest" });
          return;
        }

        setState({
          status: "authenticated",
          profile: session.user,
        });
      })
      .catch((error) => {
        setState({
          status: "error",
          message:
            resolveWeappErrorMessage(error) ??
            messages.errors.sessionUnavailable,
        });
      });
  });

  return (
    <View className="safe-page safe-page--tabbed page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">{messages.home.title}</Text>
        <Text className="page-desc">{messages.home.description}</Text>
      </View>

      {state.status === "loading" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">
                {messages.home.loadingTitle}
              </Text>
              <Text className="hero-card__desc">
                {messages.home.loadingDescription}
              </Text>
            </View>
            <Text className="inline-status">
              {messages.common.status.loading}
            </Text>
          </View>
        </View>
      ) : null}

      {state.status === "guest" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">
                {messages.home.guestTitle}
              </Text>
              <Text className="hero-card__desc">
                {messages.home.guestDescription}
              </Text>
            </View>
            <Text className="inline-status">
              {messages.common.status.signedOut}
            </Text>
          </View>
          <View className="weapp-action-group">
            <Navigator
              url="/pages/login/index"
              className="weapp-button weapp-button--primary"
              data-testid="home-login-action"
            >
              {messages.home.guestAction}
            </Navigator>
          </View>
        </View>
      ) : null}

      {state.status === "error" ? (
        <View className="message-box message-box--error">{state.message}</View>
      ) : null}

      {state.status === "authenticated" ? (
        <>
          <View className="card hero-card" data-testid="home-auth-card">
            <View className="hero-card__header">
              <View className="hero-card__copy">
                <Text className="hero-card__title">{state.profile.name}</Text>
                <Text
                  className="hero-card__desc"
                  data-testid="home-email-value"
                >
                  {state.profile.email}
                </Text>
              </View>
              <Text className="inline-status inline-status--success">
                {messages.common.status.signedIn}
              </Text>
            </View>
            <View className="hero-card__meta">
              <View className="hero-meta">
                <Text className="hero-meta__label">
                  {messages.home.rolesLabel}
                </Text>
                <Text className="hero-meta__value">
                  {state.profile.roles.join(", ") || "-"}
                </Text>
              </View>
              <View className="hero-meta">
                <Text className="hero-meta__label">
                  {messages.home.sessionLabel}
                </Text>
                <Text className="hero-meta__value">
                  {messages.common.status.signedIn}
                </Text>
              </View>
            </View>
          </View>

          <View className="section-stack">
            <Text className="section-title">{messages.home.accountTitle}</Text>
            <View className="card card-section">
              <View className="list list--tight">
                <View className="list-row">
                  <Text className="list-label">{messages.home.emailLabel}</Text>
                  <Text className="list-value">{state.profile.email}</Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">
                    {messages.home.userIdLabel}
                  </Text>
                  <Text className="list-value list-value--mono">
                    {state.profile.id}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}

      <View className="section-stack">
        <Text className="section-title">{messages.home.quickAccessTitle}</Text>
        <View className="card card-section">
          <Navigator
            className="row-link"
            openType="switchTab"
            url="/pages/profile/index"
            data-testid="home-me-link"
          >
            <View className="row-link__copy">
              <Text className="row-link__title">{messages.home.meTitle}</Text>
              <Text className="row-link__desc">
                {messages.home.meDescription}
              </Text>
            </View>
            <Text className="row-link__chevron">›</Text>
          </Navigator>
        </View>
      </View>
    </View>
  );
}
