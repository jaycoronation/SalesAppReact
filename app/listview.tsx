import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";


export default function MyList() {

    const router = useRouter();

  const [data, setData] = useState([
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
  ]);

  const [loading, setLoading] = useState(false);

  // 👉 Load more data
  const loadMoreData = () => {
    if (loading) return;

    setLoading(true);   

    setTimeout(() => {
      const newData = data.length + 1;

      const moreItems = Array.from({ length: 5 }, (_, i) => ({
        id: (newData + i).toString(),
        name: `Item ${newData + i}`,
      }));

      setData([...data, ...moreItems]);
      setLoading(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}

  stickyHeaderIndices={[0]} 
       ListHeaderComponent={
        <View style={styles.headerContainer}>
            <Pressable
                onPress={() => router.back()}
                style={{ flexDirection: "row", alignItems: "center" }}
                >
                <Ionicons name="arrow-back" size={24} />
                <Text style={{ marginLeft: 8 }}>Header</Text>
                </Pressable>
        </View>
        }

        ListFooterComponent={
          loading ? <ActivityIndicator size="large" /> : <Text>Footer</Text>
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name}</Text>
          </View>
        )}
        onEndReached={loadMoreData}         
        onEndReachedThreshold={0.5}         
      />
    </View>
  );
}

const styles = StyleSheet.create({
    headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    // paddingTop: 20,
    backgroundColor: "#000000",
    },

    padding_header: {
    fontSize: 18,
    marginLeft: 10,
    fontWeight: "bold",
    },
    container: { 
        flex: 1,
        padding: 20 
    },
  item: {
    padding: 15,
    backgroundColor: "#eee",
    marginBottom: 10,
    borderRadius: 8,
  },
});