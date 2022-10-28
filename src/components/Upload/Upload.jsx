import React, { useEffect, useRef, useState } from "react";
import  cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import cornerstoneWebImageLoader from "cornerstone-web-image-loader";
import cornerstoneTools from "cornerstone-tools";
import dicomParser from "dicom-parser";
import cornerstoneMath from "cornerstone-math"
import Hammer from "hammerjs";
import "./Upload.css"
import { Fragment } from "react";

export default function Upload() {
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const mouseToolsRef=useRef(null)
  let result=undefined
  let fileImgId=''




  let mouseToolChain = [
    { name: "Wwwc", func: cornerstoneTools.WwwcTool, config: {} },
    { name: "Pan", func: cornerstoneTools.PanTool, config: {} },
    { name: "Magnify", func: cornerstoneTools.MagnifyTool, config: {} },
    { name: "Angle", func: cornerstoneTools.AngleTool, config: {} },
    {name:'Length',func:cornerstoneTools.LengthTool,config:{}},
    {name:'ZoomMouseWheel',func:cornerstoneTools.ZoomMouseWheelTool,config:{}},
    { name: "Eraser", func: cornerstoneTools.EraserTool, config: {} },


  ];

  let [mouseTool,setMouseTool]=useState(mouseToolChain[0].name)

  const changeTools=(e)=>{
    const toolName = e.target.value;
    for (let i = 0; i < mouseToolChain.length; i++) {
      if (mouseToolChain[i].name === toolName) {
        // panning
        cornerstoneTools.addTool(mouseToolChain[i].func);
        cornerstoneTools.setToolActive(mouseToolChain[i].name, {
          mouseButtonMask: 1
        });
      } else {
        cornerstoneTools.addTool(mouseToolChain[i].func);
        cornerstoneTools.setToolPassive(mouseToolChain[i].name, {
          mouseButtonMask: 1
        });

        // You can make tool disabled
        // cornerstoneTools.setToolDisabled(leftMouseToolChain[i].name, {
        //   mouseButtonMask: 1
        // });
      }}
      setMouseTool(toolName);

  }

  // let [result, setResult] = useState(undefined); //存储当前选中的dcm文件解析后的对象
  // const [fileImgId, setFileImgId] = useState(""); //当前选中的文件的imgId
  cornerstoneTools.external.cornerstone=cornerstone
  cornerstoneTools.external.cornerstoneMath=cornerstoneMath
  cornerstoneTools.external.Hammer=Hammer
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

// localStorage.setItem("debug", "cornerstoneTools") 
  const upload=()=>{
    fileRef.current.click()
  }
  function extend() {
    let loadedDataSets = {};
    const dataSetCacheManager = cornerstoneWADOImageLoader.wadouri.dataSetCacheManager;
    let getCache = dataSetCacheManager.get;
    cornerstoneWADOImageLoader.wadouri.dataSetCacheManager = {
      ...dataSetCacheManager,
      get(uri) {
        console.log(uri, loadedDataSets, "extend get");
        if (loadedDataSets[uri]) return loadedDataSets[uri].dataSet;
        return getCache(uri);
      },
      add(uri, dataSet) {
        if (!loadedDataSets[uri]) {
          loadedDataSets[uri] = {};
        }
        loadedDataSets[uri].dataSet = dataSet;
      }
    }
  }
  cornerstoneTools.init()

  //成为容器
  //useEffect中能够获取到ref
  useEffect(() => {

  cornerstone.enable(imgRef.current);


  extend()

  },[]);

  cornerstone.metaData.addProvider(function (type, imageId) {
    if (type == "imagePixelModule" && imageId == fileImgId) {
      console.log(imageId, result, "add provider dataSet");
      return getImagePixelModule(result);
    }
    return metaDataProvider(type, imageId);
  })


  function metaDataProvider(type, imageId) {
    var parsedImageId = cornerstoneWADOImageLoader.wadouri.parseImageId(imageId);
    var dataSet = cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.get(parsedImageId.url);
    if (!dataSet) {
      return;
    }
  
    if (type === 'generalSeriesModule') {
      return {
        modality: dataSet.string('x00080060'),
        seriesInstanceUID: dataSet.string('x0020000e'),
        seriesNumber: dataSet.intString('x00200011'),
        studyInstanceUID: dataSet.string('x0020000d'),
        seriesDate: dicomParser.parseDA(dataSet.string('x00080021')),
        seriesTime: dicomParser.parseTM(dataSet.string('x00080031') || '')
      };
    }
  
    if (type === 'patientStudyModule') {
      return {
        patientAge: dataSet.intString('x00101010'),
        patientSize: dataSet.floatString('x00101020'),
        patientWeight: dataSet.floatString('x00101030')
      };
    }
  
    if (type === 'imagePlaneModule') {
      var imageOrientationPatient = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00200037', 6);
      var imagePositionPatient = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00200032', 3);
      var pixelSpacing = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00280030', 2);
      var columnPixelSpacing = null;
      var rowPixelSpacing = null;
  
      if (pixelSpacing) {
        rowPixelSpacing = pixelSpacing[0];
        columnPixelSpacing = pixelSpacing[1];
      }
  
      var rowCosines = null;
      var columnCosines = null;
  
      if (imageOrientationPatient) {
        rowCosines = [parseFloat(imageOrientationPatient[0]), parseFloat(imageOrientationPatient[1]), parseFloat(imageOrientationPatient[2])];
        columnCosines = [parseFloat(imageOrientationPatient[3]), parseFloat(imageOrientationPatient[4]), parseFloat(imageOrientationPatient[5])];
      }
  
      return {
        frameOfReferenceUID: dataSet.string('x00200052'),
        rows: dataSet.uint16('x00280010'),
        columns: dataSet.uint16('x00280011'),
        imageOrientationPatient: imageOrientationPatient,
        rowCosines: rowCosines,
        columnCosines: columnCosines,
        imagePositionPatient: imagePositionPatient,
        sliceThickness: dataSet.floatString('x00180050'),
        sliceLocation: dataSet.floatString('x00201041'),
        pixelSpacing: pixelSpacing,
        rowPixelSpacing: rowPixelSpacing,
        columnPixelSpacing: columnPixelSpacing
      };
    }
  
    if (type === 'imagePixelModule') {
      return cornerstoneWADOImageLoader.wadouri.metaData.getImagePixelModule(dataSet);
    }
  
    if (type === 'modalityLutModule') {
      return {
        rescaleIntercept: dataSet.floatString('x00281052'),
        rescaleSlope: dataSet.floatString('x00281053'),
        rescaleType: dataSet.string('x00281054'),
        modalityLUTSequence: cornerstoneWADOImageLoader.wadouri.metaData.getLUTs(dataSet.uint16('x00280103'), dataSet.elements.x00283000)
      };
    }
  
    if (type === 'voiLutModule') {
      var modalityLUTOutputPixelRepresentation = cornerstoneWADOImageLoader.wadouri.metaData.getModalityLUTOutputPixelRepresentation(dataSet);
      return {
        windowCenter: cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00281050', 1),
        windowWidth: cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00281051', 1),
        voiLUTSequence: cornerstoneWADOImageLoader.wadouri.metaData.getLUTs(modalityLUTOutputPixelRepresentation, dataSet.elements.x00283010)
      };
    }
  
    if (type === 'sopCommonModule') {
      return {
        sopClassUID: dataSet.string('x00080016'),
        sopInstanceUID: dataSet.string('x00080018')
      };
    }
  
    if (type === 'petIsotopeModule') {
      var radiopharmaceuticalInfo = dataSet.elements.x00540016;
  
      if (radiopharmaceuticalInfo === undefined) {
        return;
      }
  
      var firstRadiopharmaceuticalInfoDataSet = radiopharmaceuticalInfo.items[0].dataSet;
      return {
        radiopharmaceuticalInfo: {
          radiopharmaceuticalStartTime: dicomParser.parseTM(firstRadiopharmaceuticalInfoDataSet.string('x00181072') || ''),
          radionuclideTotalDose: firstRadiopharmaceuticalInfoDataSet.floatString('x00181074'),
          radionuclideHalfLife: firstRadiopharmaceuticalInfoDataSet.floatString('x00181075')
        }
      };
    }
  
    if (type === 'overlayPlaneModule') {
      return getOverlayPlaneModule(dataSet);
    }
  }
  
  function getOverlayPlaneModule(dataSet) {
    var overlays = [];
  
    for (var overlayGroup = 0x00; overlayGroup <= 0x1e; overlayGroup += 0x02) {
      var groupStr = "x60".concat(overlayGroup.toString(16));
  
      if (groupStr.length === 4) {
        groupStr = "x600".concat(overlayGroup.toString(16));
      }
  
      var data = dataSet.elements["".concat(groupStr, "3000")];
  
      if (!data) {
        continue;
      }
  
      var pixelData = [];
  
      for (var i = 0; i < data.length; i++) {
        for (var k = 0; k < 8; k++) {
          var byte_as_int = dataSet.byteArray[data.dataOffset + i];
          pixelData[i * 8 + k] = byte_as_int >> k & 1; // eslint-disable-line no-bitwise
        }
      }
  
      overlays.push({
        rows: dataSet.uint16("".concat(groupStr, "0010")),
        columns: dataSet.uint16("".concat(groupStr, "0011")),
        type: dataSet.string("".concat(groupStr, "0040")),
        x: dataSet.int16("".concat(groupStr, "0050"), 1) - 1,
        y: dataSet.int16("".concat(groupStr, "0050"), 0) - 1,
        pixelData: pixelData,
        description: dataSet.string("".concat(groupStr, "0022")),
        label: dataSet.string("".concat(groupStr, "1500")),
        roiArea: dataSet.string("".concat(groupStr, "1301")),
        roiMean: dataSet.string("".concat(groupStr, "1302")),
        roiStandardDeviation: dataSet.string("".concat(groupStr, "1303"))
      });
    }
  
    return {
      overlays: overlays
    };
  }
  
  function getLutDescriptor(dataSet, tag) {
    if (!dataSet.elements[tag] || dataSet.elements[tag].length !== 6) {
      return;
    }
  
    return [dataSet.uint16(tag, 0), dataSet.uint16(tag, 1), dataSet.uint16(tag, 2)];
  }
  
  function getLutData(lutDataSet, tag, lutDescriptor) {
    var lut = [];
    var lutData = lutDataSet.elements[tag];
  
    for (var i = 0; i < lutDescriptor[0]; i++) {
      if (lutDescriptor[2] === 16) {
        lut[i] = lutDataSet.uint16(tag, i);
      } else {
        lut[i] = lutDataSet.byteArray[i + lutData.dataOffset];
      }
    }
  
    return lut;
  }
  
  function populatePaletteColorLut(dataSet, imagePixelModule) {
    imagePixelModule.redPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281101');
    imagePixelModule.greenPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281102');
    imagePixelModule.bluePaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281103');
  
    if (imagePixelModule.redPaletteColorLookupTableDescriptor[0] === 0) {
      imagePixelModule.redPaletteColorLookupTableDescriptor[0] = 65536;
      imagePixelModule.greenPaletteColorLookupTableDescriptor[0] = 65536;
      imagePixelModule.bluePaletteColorLookupTableDescriptor[0] = 65536;
    }
  
    var numLutEntries = imagePixelModule.redPaletteColorLookupTableDescriptor[0];
    var lutData = dataSet.elements.x00281201;
    var lutBitsAllocated = lutData.length === numLutEntries ? 8 : 16;
  
    if (imagePixelModule.redPaletteColorLookupTableDescriptor[2] !== lutBitsAllocated) {
      imagePixelModule.redPaletteColorLookupTableDescriptor[2] = lutBitsAllocated;
      imagePixelModule.greenPaletteColorLookupTableDescriptor[2] = lutBitsAllocated;
      imagePixelModule.bluePaletteColorLookupTableDescriptor[2] = lutBitsAllocated;
    }
  
    imagePixelModule.redPaletteColorLookupTableData = getLutData(dataSet, 'x00281201', imagePixelModule.redPaletteColorLookupTableDescriptor);
    imagePixelModule.greenPaletteColorLookupTableData = getLutData(dataSet, 'x00281202', imagePixelModule.greenPaletteColorLookupTableDescriptor);
    imagePixelModule.bluePaletteColorLookupTableData = getLutData(dataSet, 'x00281203', imagePixelModule.bluePaletteColorLookupTableDescriptor);
  }
  
  function populateSmallestLargestPixelValues(dataSet, imagePixelModule) {
    var pixelRepresentation = dataSet.uint16('x00280103');
  
    if (pixelRepresentation === 0) {
      imagePixelModule.smallestPixelValue = dataSet.uint16('x00280106');
      imagePixelModule.largestPixelValue = dataSet.uint16('x00280107');
    } else {
      imagePixelModule.smallestPixelValue = dataSet.int16('x00280106');
      imagePixelModule.largestPixelValue = dataSet.int16('x00280107');
    }
  }
  
  function getImagePixelModule(dataSet) {
    var imagePixelModule = {
      samplesPerPixel: dataSet.uint16('x00280002'),
      photometricInterpretation: dataSet.string('x00280004'),
      rows: dataSet.uint16('x00280010'),
      columns: dataSet.uint16('x00280011'),
      bitsAllocated: dataSet.uint16('x00280100'),
      bitsStored: dataSet.uint16('x00280101'),
      highBit: dataSet.uint16('x00280102'),
      pixelRepresentation: dataSet.uint16('x00280103'),
      planarConfiguration: dataSet.uint16('x00280006'),
      pixelAspectRatio: dataSet.string('x00280034')
    };
    populateSmallestLargestPixelValues(dataSet, imagePixelModule);
  
    if (imagePixelModule.photometricInterpretation === 'PALETTE COLOR' && dataSet.elements.x00281101) {
      populatePaletteColorLut(dataSet, imagePixelModule);
    }
    return imagePixelModule;
  }
  extend()

  const changeFile = (e) => {
  let files = e.target.files;
  if (!files || !files.length) return;
  console.log(files);
  //用于预览的
  let file = files[files.length-1];
//   cornerstone.disable(imgRef.current);
  let read = new FileReader();
  read.readAsArrayBuffer(file);
  read.onload = function () {
    //后面的要使用循环，将该文件夹的所有文件都加入缓存区

    result=dicomParser.parseDicom(new Uint8Array(this.result))
    let url = "http://" + file.name;
    fileImgId="wadouri:" + url
    //设置映射关系
    cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.add(url, result);


    cornerstone.imageCache.putImageLoadObject(fileImgId, cornerstoneWADOImageLoader.wadouri.loadImageFromPromise(new Promise((res) => {
      res(result);
    }), fileImgId))


    for(let i=0;i<mouseTool.length;i++){
      cornerstoneTools.addTool(mouseToolChain[0].func);
        cornerstoneTools.setToolActive(mouseToolChain[0].name, {
          mouseButtonMask: 1
    })
  }
    // const WwwcTool = cornerstoneTools.WwwcTool;
    // cornerstoneTools.addTool(WwwcTool)
    // cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 })

    // const AngleTool = cornerstoneTools.AngleTool;
    // cornerstoneTools.addTool(AngleTool)
    // cornerstoneTools.setToolActive("Angle",{mouseButtonMask:1})

    //加载dcm文件并缓存
    cornerstone.loadAndCacheImage(fileImgId).then(img => {
    //   cornerstone.enable(imgRef.current);
      cornerstone.displayImage(imgRef.current, img);
    });
  }
  };

//初始化tools

  



  return (
    <div>
      <button onClick={upload}>上传</button>
    

      <input type="file" onChange={changeFile} style={{display:"none"}} webkitdirectory="true" ref={fileRef} />
      <div  className="img" onContextMenu={()=>false} onMouseDown={()=>false} 
        ref={imgRef}></div>

      <form ref={mouseToolsRef}
      onChange={changeTools}
      >
        {
         mouseToolChain.map((tool)=>(
          <Fragment key={tool.name} >
            <label htmlFor={tool.name}>{` ${tool.name} `}</label>
              <input
                type="radio"
                name="mouse-tool"
                id={tool.name}
                value={tool.name}
                checked={tool.name === mouseTool}
              />

          </Fragment>
         )) 
        }


      </form>

      
    </div>
  );
}
