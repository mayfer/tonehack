function WavSaver() {
    var example = "52 49 46 46 24 08 00 00 57 41 56 45 66 6d 74 20 10 00 00 00 01 00 02 00 22 56 00 00 88 58 01 00 04 00 10 00 64 61 74 61 00 08 00 00 00 00 00 00 24 17 1e f3 3c 13 3c 14 16 f9 18 f9 34 e7 23 a6 3c f2 24 f2 11 ce 1a 0d";
    
    var hexdata = example.split(" ");
    var buffer = new Uint8Array(hexdata.length); // allocates 8 bytes

    for(var i = 0; i < hexdata.length; i++) {
        buffer[i] = parseInt("0x" + hexdata[i]);
    }
     
    saveAs(new Blob([buffer], {type: "audio/wav"}), "test.wav");
}
