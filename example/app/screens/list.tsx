import {useRoute} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {list} from '../utils/files';
import {FlatList, RefreshControl, Text, View} from 'react-native';
import FileRow from '../componenets/fileRow';

export default function ListScreen() {
  const {params} = useRoute();
  // @ts-ignore
  const current_path = params!.path;
  const {data, isFetching, refetch} = useQuery(['list', current_path], () => {
    console.log('rrr',['list', current_path]);
    return list(current_path);
  });

  return (
    <View
      style={{
        flex: 1,
      }}>
      <Text style={{padding: 20}}>{current_path}</Text>
      <FlatList
        style={{flexGrow: 1}}
        contentContainerStyle={{flexGrow: 1, paddingVertical: 20}}
        refreshControl={
          <RefreshControl
            tintColor={'black'}
            colors={['black']}
            refreshing={isFetching}
            onRefresh={refetch}
          />
        }
        data={data}
        keyExtractor={item => item.key}
        renderItem={({item}) => (
          <FileRow name={item.key} meta={item.meta} url={item.url} />
        )}
      />
    </View>
  );
}
