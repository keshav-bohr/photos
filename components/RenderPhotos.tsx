import React, {useEffect, createRef, useState, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  View,
  FlatList,
  SafeAreaView,
  ScrollView,
  Systrace
} from 'react-native';
import { layout, FlatSection, ScrollEvent, story,  } from '../types/interfaces';
import PhotosChunk from './PhotosChunk';
import ThumbScroll from './ThumbScroll';
import Highlights from './Highlights';
import { RecyclerListView, DataProvider, AutoScroll, BaseScrollView, LayoutProvider } from 'recyclerlistview';
import { LayoutUtil } from '../utils/LayoutUtil';
import FloatingFilters from './FloatingFilters';
import { useBackHandler } from '@react-native-community/hooks'
import { Asset } from 'expo-media-library';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
class ExternalScrollView extends BaseScrollView {

  scrollTo(...args: any[]) {
    if ((this.props as any).scrollRefExternal?.current) { 
      (this.props as any).scrollRefExternal?.current?.scrollTo(...args);
    }
  }
  render() {
    return (
      <AnimatedScrollView {...this.props}
        style={{zIndex:1}}
        ref={(scrollView: any) => {(this.props as any).scrollRefExternal.current = scrollView;}}
        scrollEventThrottle={16}
        nestedScrollEnabled = {true}
        onScroll={Animated.event([(this.props as any).animatedEvent], {listener: this.props.onScroll, useNativeDriver: true})}
      >
        {this.props.children}
      </AnimatedScrollView>);
  }
}
interface Props {
  photos: FlatSection;
  margin: Animated.AnimatedInterpolation;
  maxWidth: number;
  minWidth: number;
  numColumns: 2 | 3 | 4;
  opacity: Animated.AnimatedInterpolation;
  date: Date;
  loading: boolean;
  sortCondition: 'day' | 'month';
  zIndex: number;
  scale: Animated.Value;
  sizeTransformScale: Animated.AnimatedInterpolation;
  isPinchAndZoom: boolean;
  scrollOffset:{[key:number]:number};
  setScrollOffset: Function;
  setLoadMore: Function;
  focalY: Animated.Value;
  numberOfPointers: Animated.Value;
  modalShown: boolean;
  setModalShown: Function;
  setSinglePhotoIndex: Function;
  setImagePosition: Function;
  storiesHeight: number;
  stories: story[]|undefined;
  setShowStory: Function;
  showStory:boolean;
  setStory:Function;
  scrollY: Animated.Value;
  HEADER_HEIGHT: number;
  onMediaLongTap: Function;
  showSelectionCheckbox:boolean;
  selectedAssets:Asset[]|undefined;
}

const RenderPhotos: React.FC<Props> = (props) => {

  const headerHeight = 20;
  const indicatorHeight = 50;
  const [dataProvider, setDataProvider] = useState<DataProvider>(new DataProvider((r1, r2) => {
    if((typeof r1.value==='string' && typeof r2.value==='string')?(r1 !== r2):((r1.index !== r2.index) || r1.selected !== r2.selected)){
console.log(['re-rendering for',{r1:r1, r2:r2}]);
    }
    return (typeof r1.value==='string' && typeof r2.value==='string')?(r1.value !== r2.value):((r1.index !== r2.index) || r1.selected !== r2.selected);
  }));
  const [layoutProvider, setLayoutProvider] = useState<LayoutProvider>(LayoutUtil.getLayoutProvider(2, 'day', headerHeight, [], props.storiesHeight, props.HEADER_HEIGHT));
  layoutProvider.shouldRefreshWithAnchoring = true;
  const [viewLoaded, setViewLoaded] = useState<boolean>(false);
  const scrollRef:any = useRef();
  let scrollRefExternal:any = useRef();
  const [lastScrollOffset, setLastScrollOffset] = useState<number>(0);
  const [layoutHeight, setLayoutHeight] = useState<number>(99999999999999);

  const [startScroll, setStartScroll] = useState<boolean>(false);
  const [endScroll, setEndScroll] = useState<boolean>(false);
  const startScrollRef = useRef(startScroll);
  startScrollRef.current = startScroll;

  const isDragging = useRef(new Animated.Value(2)).current; //2:is scrolling using screen slide, 1: is scrolling using thumb scroll
  const velocityY = useRef(new Animated.Value(0)).current;
  const layoutHeightAnimated = useRef(new Animated.Value(9999999999999)).current;
  const [floatingFiltersOpacity, setFloatingFiltersOpacity] = useState<number>(0);

  const [currentImageTimestamp, setCurrentImageTimestamp] = useState<number>(0);
  const dragY = useRef(new Animated.Value(0)).current;

  const [showThumbScroll, setShowThumbScroll] = useState<boolean>(false);

  useEffect(()=>{
    console.log([Date.now()+': component RenderPhotos'+props.numColumns+' rendered']);
  });

  useEffect(()=>{
    console.log(['component RenderPhotos mounted']);
    return () => {console.log(['component RenderPhotos unmounted']);}
  }, []);
  useEffect(()=>{
    console.log('photos.layout length changed');
    if(dataProvider.getAllData().length !== props.photos.layout.length){
    let data = props.photos.layout;
    setLayoutProvider(LayoutUtil.getLayoutProvider(props.numColumns, props.sortCondition, headerHeight, data, props.storiesHeight, props.HEADER_HEIGHT));
    //setDataProvider(dataProvider.cloneWithRows(dataProvider.getAllData().concat(props.photos.layout),(dataProvider.getAllData().length>0?dataProvider.getAllData().length-1:undefined)));
    setDataProvider(dataProvider.cloneWithRows(props.photos.layout));
    }
  },[props.photos.layout.length]);

  useBackHandler(() => {
    if (props.showSelectionCheckbox) {
      props.onMediaLongTap(undefined);
      return true
    }
    // let the default thing happen
    return false
  })
  
  const rowRenderer = (type:string | number, data:layout, index: number) => {
    switch(type){
      case 'story':
        return (
          <SafeAreaView  style={{position:'relative', zIndex:1,marginTop:2*props.HEADER_HEIGHT}}>
            <FlatList 
              data={props.stories}
              horizontal={true}
              keyExtractor={(item:story, index:number) => 'StoryItem_'+index+'_'+item.text}
              getItemLayout={(data, index) => {
                return {
                  length: 15+props.storiesHeight/1.618, 
                  offset: index*(15+props.storiesHeight/1.618), 
                  index: index
                }
              }}
              showsHorizontalScrollIndicator={false}
              renderItem={( {item} ) => (
                <View style={{width:15+props.storiesHeight/1.618,height:props.storiesHeight+25}}>
                <Highlights
                  story={item}
                  duration={1500}
                  numColumns={props.numColumns}
                  height={props.storiesHeight}
                  showStory={props.showStory}
                  setShowStory={props.setShowStory}
                  setStory={props.setStory}
                />
                </View>
              )}
            />
          </SafeAreaView>
        );
      break;
      default:
    return (
    <View style={{position:'relative', zIndex:1}}>
      <PhotosChunk
        photo={data}
        opacity={props.opacity}
        numCol={props.numColumns}
        loading={props.loading}
        scale={props.scale}
        key={'PhotosChunk_col' + props.numColumns + '_id' + index}
        index={data.index}
        sortCondition={props.sortCondition}
        modalShown={props.modalShown}
        setModalShown={props.setModalShown}
        setSinglePhotoIndex={props.setSinglePhotoIndex}
        setImagePosition={props.setImagePosition}
        headerHeight={headerHeight}
        onMediaLongTap={props.onMediaLongTap}
        showSelectionCheckbox={props.showSelectionCheckbox}
        selectedAssets={props.selectedAssets}
      />
    </View>);
    }
  };

  
  const scrollToLocation = (offset:number) => {
      if(scrollRef){
        //scrollRef.current?.scrollToOffset(0, offset, true);
        AutoScroll.scrollNow(scrollRef.current, 0, 0, 0, offset, 1).then(()=>{
          ////console.log("scroll done");
        }).catch(e=>console.log(e));
      }
  }

  const _onMomentumScrollEnd = () => {
    setTimeout(()=>{
      let lastIndex = scrollRef?.current.findApproxFirstVisibleIndex();
      let lastOffset = scrollRef?.current.getCurrentScrollOffset();
      if(lastOffset===0){
        lastIndex = 0;
      }
      props.setScrollOffset({'in':props.numColumns, 'to':lastIndex});
      ////console.log(['momentum ended', {'in':props.numColumns, 'to':lastIndex}, lastOffset]);
      
      let sampleHeight = scrollRef?.current?.getContentDimension().height;
      let lastScrollOffset = lastOffset*(SCREEN_HEIGHT-indicatorHeight)/(sampleHeight-SCREEN_HEIGHT);
      ////console.log('lastScrollOffset='+lastScrollOffset+', lastOffset='+lastOffset+', sampleHeight='+sampleHeight);
      setLastScrollOffset(lastScrollOffset);
      setShowThumbScroll(false);
    },100);
  }
  const _onScrollEnd = () => {
    ////console.log('scroll end called');
    let sampleHeight = scrollRef?.current?.getContentDimension().height;
    let lastOffset = scrollRef?.current.getCurrentScrollOffset();
    let lastScrollOffset = lastOffset*(SCREEN_HEIGHT-indicatorHeight)/(sampleHeight-SCREEN_HEIGHT);
    setLastScrollOffset(lastScrollOffset);
  }

  const scrollBarToViewSync = (value:number)=> {
    //console.log('value+lastScrollOffset='+(value+lastScrollOffset));
    let sampleHeight = scrollRef?.current?.getContentDimension().height;
    let ViewOffset = ((value+lastScrollOffset)*(sampleHeight-SCREEN_HEIGHT))/(SCREEN_HEIGHT-indicatorHeight);
    //console.log('value='+value);
    //console.log('ViewOffset='+ViewOffset);
    //console.log('sampleHeight='+sampleHeight);
    //console.log('SCREEN_HEIGHT='+SCREEN_HEIGHT);
    scrollRef.current.scrollToOffset(0, ViewOffset, false );
    let currentImageIndex = scrollRef.current.findApproxFirstVisibleIndex();
    let currentImage = props.photos.layout[currentImageIndex].value;
    let currentTimeStamp = 0;
    if(typeof currentImage === 'string'){
      currentImage = props.photos.layout[currentImageIndex+1]?.value;
      if(currentImage && typeof currentImage === 'string'){
        currentImage = props.photos.layout[currentImageIndex+2]?.value;
      }
    }
    if(currentImage && typeof currentImage !== 'string'){
      currentTimeStamp = currentImage.modificationTime;
    }
    setCurrentImageTimestamp(currentTimeStamp);
  }
  dragY.removeAllListeners();
  let animateId = dragY.addListener(({ value }) => {
    scrollBarToViewSync(value);
  });
 
  useEffect(()=>{
      setViewLoaded(true);
  },[scrollRef, scrollRef.current]);

  const adjustScrollPosition = (newOffset:{[key:string]:(2|3|4|number)}) => {
    let numColumns:number = props.numColumns;
    if( viewLoaded && numColumns !== newOffset.in){
      scrollRef?.current?.scrollToIndex(newOffset.to, false);
    }
  }
  useEffect(()=>{
    adjustScrollPosition(props.scrollOffset);
  },[props.scrollOffset]);

  useEffect(()=>{
    if(endScroll === true){
      _onMomentumScrollEnd();
    }
  },[endScroll]);

  const _onScroll = (rawEvent: ScrollEvent, offsetX: number, offsetY: number) => {
    //console.log(props.numColumns+'_'+rawEvent.nativeEvent.contentOffset.y);
    setShowThumbScroll(true);
  }
  
  return props.photos.layout ? (
    <Animated.View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        left: 0,
        opacity: props.opacity,
        zIndex: props.zIndex,
        transform: [
          {
            scale: props.sizeTransformScale
          },
          {
            translateX: Animated.divide(
              Animated.subtract(
                Animated.multiply(
                  props.sizeTransformScale,SCREEN_WIDTH), 
                SCREEN_WIDTH)
              , Animated.multiply(2,props.sizeTransformScale))
          },
          {
            translateY: Animated.divide(
              Animated.subtract(
                Animated.multiply(
                  props.sizeTransformScale,(SCREEN_HEIGHT-(StatusBar.currentHeight || 0))
                ), (SCREEN_HEIGHT-(StatusBar.currentHeight || 0))
              )
              , Animated.multiply(2,props.sizeTransformScale))
          }
        ],
      }}
    >
      <RecyclerListView
        ref={scrollRef}
        externalScrollView={ExternalScrollView}
        style={{
          flex: 1,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          position: 'absolute',
          top: 0,
          bottom: 0,
          marginTop: 0,
          right: 0,
          left: 0,
          zIndex:1,
        }}
        contentContainerStyle={{ margin: 0 }}
        ////onEndReached={() => props.setLoadMore(new Date().getTime())}
        ////onEndReachedThreshold={0.4}
        dataProvider={dataProvider}
        layoutProvider={layoutProvider}
        rowRenderer={rowRenderer}
        scrollEnabled={!props.isPinchAndZoom}
        onScroll={_onScroll}
        key={"RecyclerListView_"+props.sortCondition + props.numColumns}
        scrollEventThrottle={16}
        extendedState={{showSelectionCheckbox:props.showSelectionCheckbox}}
        scrollViewProps={{
          ////ref: scrollRefExternal,
          onMomentumScrollEnd: _onMomentumScrollEnd,
          ////onScrollEndDrag: _onScrollEnd,
          scrollRefExternal:scrollRefExternal,
          scrollEventThrottle:16,
          automaticallyAdjustContentInsets: false,
          showsVerticalScrollIndicator:false,
          animatedEvent:{nativeEvent: {contentOffset: {y: props.scrollY}, contentSize: {height: layoutHeightAnimated}}},
        }}
      />
      
      <ThumbScroll
        indicatorHeight={indicatorHeight}
        flexibleIndicator={false}
        shouldIndicatorHide={true}
        showThumbScroll={showThumbScroll}
        setShowThumbScroll={setShowThumbScroll}
        hideTimeout={500}
        lastOffset={lastScrollOffset}
        setLastScrollOffset={setLastScrollOffset}
        numColumns={props.numColumns}
        headerIndexes={props.photos.headerIndexes}
        numberOfPointers={props.numberOfPointers}
        headerHeight={headerHeight}
        scrollY={props.scrollY}
        velocityY={velocityY}
        scrollRef={scrollRef}
        setStartScroll={setStartScroll}
        setEndScroll={setEndScroll}
        startScroll={startScroll}
        scrollIndicatorContainerStyle={{}}
        scrollIndicatorStyle={{}}
        layoutHeight={layoutHeightAnimated}
        isDragging={isDragging}
        dragY={dragY}
        floatingFiltersOpacity = {floatingFiltersOpacity}
        setFloatingFiltersOpacity = {setFloatingFiltersOpacity}
        currentImageTimestamp={currentImageTimestamp}
      />
      <FloatingFilters
        headerIndexes={props.photos.headerIndexes}
        floatingFiltersOpacity={floatingFiltersOpacity}
        numColumns={props.numColumns}
        sortCondition={props.sortCondition}
        scrollRef={scrollRef}
        headerHeight={headerHeight}
        layoutHeight={layoutHeightAnimated}
      />
    </Animated.View>
  ) : (
    <Animated.View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        flex: 1,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        position: 'absolute',
        top: 0,
        bottom: 0,
        marginTop: StatusBar.currentHeight || 0,
        right: 0,
        left: 0,
        opacity: props.opacity,
      }}>
      <Text>Loading...</Text>
    </Animated.View>
  );
};
const styles = StyleSheet.create({
  header: {
    fontSize: 18,
    backgroundColor: '#fff',
  },
});
function arePropsEqual(prevProps:Props, nextProps:Props) {
  console.log('RenderPhotos memo condition:'+(prevProps.photos?.layout?.length === nextProps.photos?.layout?.length));
  return prevProps.photos?.layout?.length === nextProps.photos?.layout?.length && prevProps.zIndex === nextProps.zIndex; 
}
export default React.memo(RenderPhotos);
