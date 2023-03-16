import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMutation} from '@tanstack/react-query';
import {Text, TouchableOpacity} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {nanoid} from 'nanoid/non-secure';
import {useUploader} from 'react-native-presigned-s3';

export default function UploadScreen() {
  const {addUpload} = useUploader();
  const upload = useMutation({
    mutationKey: ['upload'],
    mutationFn: async () => {
      const img = await ImagePicker.openPicker({
        mediaType: 'photo',
      });
      console.log(img);
      addUpload(
        `tmp/${nanoid(5)}.${img.mime === 'image/png' ? 'png' : 'jpeg'}`,
        img.path,
        {
          // extra: {'x-amz-ssf': 'kkf'},
          payload: {a: 'b'},
          type: img.mime,
        },
      );
    },
  });

  return (
    <SafeAreaView
      style={{flex: 1, alignItems: 'center', justifyContent: 'flex-start'}}>
      <TouchableOpacity
        disabled={!upload.isIdle}
        onPress={() => upload.mutateAsync()}>
        <Text>Pick Image</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
