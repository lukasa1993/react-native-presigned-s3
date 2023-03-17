import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMutation} from '@tanstack/react-query';
import {Text, TouchableOpacity} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {nanoid} from 'nanoid/non-secure';
import {useList} from 'react-native-presigned-s3';
import {useNavigation, useRoute} from '@react-navigation/native';
// @ts-ignore
import path from 'path-browserify';
export default function UploadScreen() {
  const navigation = useNavigation();
  const {params} = useRoute();

  // @ts-ignore
  const current_path = params!.path;
  const {addUpload} = useList(current_path);

  const upload = useMutation({
    mutationKey: ['upload'],
    mutationFn: async () => {
      const img = await ImagePicker.openPicker({
        mediaType: 'photo',
      });
      // @ts-ignore
      const key = path.join(current_path, `${nanoid(5)}_${img.filename}`);

      addUpload(key, img.path, {
        payload: {a: 'b'},
        type: img.mime,
      });
      navigation.goBack();
    },
  });

  return (
    <SafeAreaView
      style={{flex: 1, alignItems: 'center', justifyContent: 'flex-start'}}>
      <Text style={{marginBottom: 40}}>
        Uploading To Folder: {current_path}
      </Text>
      <TouchableOpacity
        disabled={upload.isLoading}
        onPress={() => upload.mutateAsync()}>
        <Text>Pick Image</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
