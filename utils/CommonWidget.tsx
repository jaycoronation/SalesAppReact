import type { FC } from "react";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Colors } from "./colors";
import { Fonts } from "./fonts";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
   style?: any;
}

const CustomButton: FC<Props> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
    style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        (loading || disabled) && styles.disabled,
        style,   // ✅ apply external style here
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.brandColor,
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: Fonts.bold,  
  },
});