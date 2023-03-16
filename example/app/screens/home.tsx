import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';

export default function HomeScreen() {
  const {navigate} = useNavigation();
  return (
    <SafeAreaView
      style={{flex: 1, alignItems: 'center', justifyContent: 'flex-start'}}>
      <Text>Home Screen</Text>
      <View
        style={{flex: 1, justifyContent: 'space-evenly', alignItems: 'center'}}>
        <TouchableOpacity
          onPress={() => {
            // @ts-ignore
            navigate('List');
          }}>
          <View>
            <Text>List</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            // @ts-ignore
            navigate('Upload');
          }}>
          <View>
            <Text>Upload</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
