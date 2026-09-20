/**
 * Signup screen: full name, email, phone, password (min 8, show/hide,
 * strength meter), street, city, state, ZIP. All required, inline errors.
 * On success -> verify-otp with the email param.
 */

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Field,
  PasswordStrength,
  PrimaryButton,
  passwordScore,
  theme,
} from "../../components/ui";
import { signUp } from "../../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  form?: string;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = "Enter your full name.";
    if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) e.phone = "Enter a valid phone number.";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
    else if (passwordScore(password) < 2)
      e.password = "Choose a stronger password.";
    if (street.trim().length < 3) e.street = "Enter your street address.";
    if (city.trim().length < 2) e.city = "Enter your city.";
    if (!/^[A-Za-z]{2}$/.test(state.trim()))
      e.state = "Enter your 2-letter state code.";
    if (!ZIP_RE.test(zip.trim())) e.zip = "Enter a valid ZIP code.";
    return e;
  };

  const clearError = (key: keyof Errors) =>
    setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));

  const onSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    try {
      await signUp({
        name,
        email,
        phone,
        password,
        addressStreet: street,
        addressCity: city,
        addressState: state,
        addressZip: zip,
      });
      router.push({ pathname: "/(auth)/verify-otp", params: { email: email.trim() } });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Signup failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            We will send a 6-digit code to verify your email.
          </Text>

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

          <Field
            label="Full name"
            value={name}
            onChangeText={(t) => { setName(t); clearError("name"); }}
            error={errors.name}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Jane Appleseed"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); clearError("email"); }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="jane@example.com"
          />
          <Field
            label="Phone"
            value={phone}
            onChangeText={(t) => { setPhone(t); clearError("phone"); }}
            error={errors.phone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+1 555 010 2030"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError("password"); }}
            error={errors.password}
            secureTextEntry
            toggleSecure
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
          />
          <PasswordStrength password={password} />
          <Field
            label="Street address"
            value={street}
            onChangeText={(t) => { setStreet(t); clearError("street"); }}
            error={errors.street}
            autoCapitalize="words"
            autoComplete="street-address"
            placeholder="123 Market St, Apt 4B"
          />
          <View style={styles.row}>
            <View style={styles.city}>
              <Field
                label="City"
                value={city}
                onChangeText={(t) => { setCity(t); clearError("city"); }}
                error={errors.city}
                autoCapitalize="words"
                placeholder="New York"
              />
            </View>
            <View style={styles.state}>
              <Field
                label="State"
                value={state}
                onChangeText={(t) => { setState(t.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)); clearError("state"); }}
                error={errors.state}
                autoCapitalize="characters"
                maxLength={2}
                placeholder="NY"
              />
            </View>
            <View style={styles.zip}>
              <Field
                label="ZIP"
                value={zip}
                onChangeText={(t) => { setZip(t); clearError("zip"); }}
                error={errors.zip}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="10001"
              />
            </View>
          </View>

          <PrimaryButton
            title="Continue"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submit}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.bg, flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 12, alignSelf: "flex-start", padding: 4 },
  title: { color: theme.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: theme.muted, fontSize: 15, marginBottom: 20, marginTop: 6 },
  formError: {
    backgroundColor: "#3A1720",
    borderRadius: theme.radiusSm,
    color: theme.danger,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 14,
    padding: 12,
  },
  row: { flexDirection: "row", gap: 10 },
  city: { flex: 2 },
  state: { flex: 1 },
  zip: { flex: 1.2 },
  submit: { marginTop: 8 },
  loginRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  loginText: { color: theme.muted, fontSize: 14 },
  loginLink: { color: theme.accent, fontSize: 14, fontWeight: "700" },
});
