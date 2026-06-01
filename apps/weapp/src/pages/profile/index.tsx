import { Navigator, Text, View } from "@tarojs/components";
import { useDidShow } from "@tarojs/taro";
import type { CustomerMeResult } from "@rtnn/api-sdk";
import { TEMPLATE_DISPLAY } from "@rtnn/config";
import { useState } from "react";
import { getWeappMessages } from "../../lib/i18n";
import { resolveWeappErrorMessage } from "../../lib/errors";
import { relaunchToLogin } from "../../lib/navigation";
import { getSdkClient } from "../../lib/sdk/client";
import { authSession } from "../../lib/session/auth";
import "./index.css";

type ProfileState =
  | {
      status: "loading";
    }
  | {
      status: "guest";
      message: string;
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "authenticated";
      profile: CustomerMeResult["user"];
    };

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    status: "loading",
  });
  const messages = getWeappMessages();

  useDidShow(() => {
    setState({ status: "loading" });

    authSession
      .restoreSession()
      .then((result) => {
        if (!result) {
          setState({
            status: "guest",
            message: messages.profile.guestDescription,
          });
          return;
        }

        setState({
          status: "authenticated",
          profile: result.user,
        });
      })
      .catch((error) => {
        setState({
          status: "error",
          message: resolveWeappErrorMessage(error),
        });
      });
  });

  const handleLogout = async () => {
    const refreshToken = authSession.getRefreshToken();
    if (refreshToken) {
      const client = getSdkClient();
      try {
        await client.auth.customer.logout({ refreshToken });
      } catch {
        // best effort, ignore failures
      }
    }
    authSession.logout();
    relaunchToLogin();
  };

  const profile = state.status === "authenticated" ? state.profile : null;
  const initials = profile?.name.trim().slice(0, 1).toUpperCase() || "G";

  return (
    <View className="safe-page safe-page--tabbed page-stack">
      <View className="page-header">
        <Text className="page-brand">{TEMPLATE_DISPLAY.brand}</Text>
        <Text className="page-title">{messages.profile.title}</Text>
        <Text className="page-desc">{messages.profile.description}</Text>
      </View>

      {state.status === "loading" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">
                {messages.profile.loadingTitle}
              </Text>
              <Text className="hero-card__desc">
                {messages.profile.loadingDescription}
              </Text>
            </View>
            <Text className="inline-status">
              {messages.common.status.loading}
            </Text>
          </View>
        </View>
      ) : null}

      {state.status === "guest" || state.status === "error" ? (
        <View className="card hero-card">
          <View className="hero-card__header">
            <View className="hero-card__copy">
              <Text className="hero-card__title">
                {state.status === "guest"
                  ? messages.profile.guestTitle
                  : messages.profile.errorTitle}
              </Text>
              <Text className="hero-card__desc">{state.message}</Text>
            </View>
            <Text className="inline-status">
              {state.status === "guest"
                ? messages.common.status.guest
                : messages.common.status.error}
            </Text>
          </View>
          <View className="weapp-action-group">
            <Navigator
              className="weapp-button weapp-button--primary"
              data-testid="profile-login-action"
              url="/pages/login/index"
            >
              {messages.profile.guestAction}
            </Navigator>
          </View>
        </View>
      ) : null}

      {profile ? (
        <>
          <View
            className="card card-section info-card"
            data-testid="profile-auth-card"
          >
            <View className="profile-hero">
              <View className="profile-avatar">
                <Text>{initials}</Text>
              </View>
              <View className="profile-hero__copy">
                <Text className="profile-hero__title">{profile.name}</Text>
                <Text
                  className="profile-hero__desc"
                  data-testid="profile-email-value"
                >
                  {profile.email}
                </Text>
              </View>
            </View>
            <Text className="inline-status inline-status--success">
              {messages.profile.signedIn}
            </Text>
          </View>

          <View className="section-stack">
            <Text className="section-title">
              {messages.profile.accountTitle}
            </Text>
            <View className="card card-section">
              <View className="list">
                <View className="list-row">
                  <Text className="list-label">
                    {messages.profile.userIdLabel}
                  </Text>
                  <Text className="list-value list-value--mono">
                    {profile.id}
                  </Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">
                    {messages.profile.emailLabel}
                  </Text>
                  <Text className="list-value">{profile.email}</Text>
                </View>
                <View className="list-row">
                  <Text className="list-label">
                    {messages.profile.roleLabel}
                  </Text>
                  <Text className="list-value">
                    {profile.roles.join(", ") || "-"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="section-stack">
            <Text className="section-title">
              {messages.profile.sessionTitle}
            </Text>
            <View className="card card-section profile-page__session-card">
              <View>
                <Text className="card-title">
                  {messages.profile.sessionTitle}
                </Text>
                <Text className="card-desc">
                  {messages.profile.sessionDescription}
                </Text>
              </View>
              <View className="weapp-action-group">
                <View
                  className="weapp-button weapp-button--danger"
                  data-testid="profile-logout-action"
                  onClick={handleLogout}
                >
                  {messages.profile.logout}
                </View>
              </View>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
