(function() {
	class Bluetooths {
		constructor() {

			this.timer = 1000;

			this._EVENTS = {};
			
            this._CHARACTERISTIC = null;

			this._QUEUE = [];

			this._WORKING = false;

			this._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

			this.gattServer = {
				namePrefix : 'QR',
				servicesId : ["49535343-fe7d-4ae5-8fa9-9fafd205e455"],
				CharacteristicId:"49535343-6daa-4d02-abf6-19569aca69fe"
			}
		}
		/*
			获取服务
		*/ 
		connect() {
			let GATT = this.gattServer;
            return new Promise(async (resolve, reject) => {
				try {
		            let device = await navigator.bluetooth.requestDevice({
				        filters: [
				        	{
				        		namePrefix: GATT.namePrefix
				        	},
				        	{
				        		services:GATT.servicesId
				        	}
				        ]
					});
					device.addEventListener('gattserverdisconnected', this._disconnect.bind(this));

					//获取连接上设备的 GATT 服务器
					let server = await device.gatt.connect();
					console.log(server)

					let service = await server.getPrimaryService(GATT.servicesId[0]);

					this._CHARACTERISTIC = await service.getCharacteristic(GATT.CharacteristicId);
					console.log('连接中..')
		            resolve();
		        }
				catch(error) {
	                console.log('Could not connect! ' + error);
					reject();
				}
			});
        }

        /*
			打印
        */ 
        print(params) {

        	if(!this.isConnected()){
				return alert('先确定打印机是否连接成功')
			}

        	if(!params){
			    return alert('error:请正确添加 [ buffer_gbk ] ')
			}

        	let {
        		buffer_gbk,
        	} = params,
        		defaults,
        		opts;

        	defaults = {
			    buffer_gbk :[]
			}

			opts = this.extend(defaults,params);

			buffer_gbk = opts.buffer_gbk;

			if(buffer_gbk.length >= 2){

				for(var i=0;i<buffer_gbk.length;i++){
        
			        ((j)=>{

			            setTimeout(()=>{

			              this.writePrintQueue(buffer_gbk[j]);
			            
			            },j*this.timer)

			        })(i)
		        }
				
			}else{
				this.writePrintQueue(buffer_gbk[0]);
			}
            
        }

        /*
			写入
        */ 
        writePrintQueue(opts){

        	let arrayBuffer = this.decode(opts),
        		tmpArrayBuffer;

        	for (let i = 0; i < arrayBuffer.byteLength; i += 100) {

      			tmpArrayBuffer = arrayBuffer.slice(i, i + 100);

      			this._queue(tmpArrayBuffer);
  			}
        }

		addEventListener(e, f) {
			this._EVENTS[e] = f;
		}

		/*
			检查是否成功连接
		*/
		isConnected() {
			return !!this._CHARACTERISTIC;
		}

		/*断开*/
		Disconnect(){

			if(!this.isConnected()){
				return alert('先确定打印机是否连接成功')
			}

			if(this._CHARACTERISTIC.service.device.gatt.connected){

				this._CHARACTERISTIC.service.device.gatt.disconnect();

			}
		}
		
		/*
			监听蓝牙断开
		*/ 
		_disconnect() {
            console.log('蓝牙已断开连接...');

			this._CHARACTERISTIC = null;
			
			if (this._EVENTS['disconnected']) {
				this._EVENTS['disconnected']();
			}
		}

		/*
			写入
		*/ 
		_queue(message) {
			var that = this;
			
			function run() {
				if (!that._QUEUE.length) {
					that._WORKING = false; 
					return;
				}
				
                that._WORKING = true;
                that._CHARACTERISTIC.writeValue(that._QUEUE.shift()).then(() => run() );
			}

            that._QUEUE.push(message);
			
			if (!that._WORKING) run();	
        }
        /*
			base64 >> Arraybuffer
        */
        decodeArrayBuffer(input) {
		    var bytes = (input.length/4) * 3;
		    var ab = new ArrayBuffer(bytes);
		    this.decode(input, ab);
		    
		    return ab;
		}
		 
		removePaddingChars(input){
		    var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
		    if(lkey == 64){
		      return input.substring(0,input.length - 1);
		    }
		    return input;
		}
		 
		decode(input, arrayBuffer) {
		    //get last chars to see if are valid
		    input = this.removePaddingChars(input);
		    input = this.removePaddingChars(input);
		 
		    var bytes = parseInt((input.length / 4) * 3, 10);
		    
		    var uarray;
		    var chr1, chr2, chr3;
		    var enc1, enc2, enc3, enc4;
		    var i = 0;
		    var j = 0;
		    
		    if (arrayBuffer)
		      uarray = new Uint8Array(arrayBuffer);
		    else
		      uarray = new Uint8Array(bytes);
		    
		    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		    
		    for (i=0; i<bytes; i+=3) {  
		      //get the 3 octects in 4 ascii chars
		      enc1 = this._keyStr.indexOf(input.charAt(j++));
		      enc2 = this._keyStr.indexOf(input.charAt(j++));
		      enc3 = this._keyStr.indexOf(input.charAt(j++));
		      enc4 = this._keyStr.indexOf(input.charAt(j++));
		  
		      chr1 = (enc1 << 2) | (enc2 >> 4);
		      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		      chr3 = ((enc3 & 3) << 6) | enc4;
		  
		      uarray[i] = chr1;      
		      if (enc3 != 64) uarray[i+1] = chr2;
		      if (enc4 != 64) uarray[i+2] = chr3;
		    }
		  
		    return uarray;  
		}

		extend(target) {
		  var _objs = Array.prototype.slice.call(arguments).slice(1),
		    _target = target;
		  if (_target.hasOwnProperty()) {
		    for (var key in _target){
		      _objs.forEach(function(v,k,i){
		        for (var okey in _objs[k]){
		          _target[okey] = _objs[k][okey]
		        }
		      })
		    }
		  }else{
		    _objs.forEach(function(v,k,i){
		      for (var okey in _objs[k]){
		        _target[okey] = _objs[k][okey]
		      }
		    })
		  }
		  return _target
		}
	}

    window.Bluetooths = new Bluetooths();

})();