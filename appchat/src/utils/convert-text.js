// Encode a string to a UTF-8 byte array, thêm 1 text ở đầu để phân biệt nó với các tin nhắn khác chưa encode
export function encode(text) {
    const encoder = new TextEncoder();
    return "encode" + encoder.encode(text).toString();
}

// Decode a UTF-8 byte array to a string
//decode những tin nhắn mà đã encode theo project
export function decode(encodedText) {
    const decoder = new TextDecoder();
    //Kiểm tra xem có phải text mà project decode hay không
    if (!encodedText.includes("encode")) {
        return encodedText;
    }
    try {
        encodedText = encodedText.replace('encode','');
        const byteArray = new Uint8Array(encodedText.split(',').map(byte => parseInt(byte)));
        return decoder.decode(byteArray);
    } catch (error) {
        return encodedText;
    }

}
// utill/convert-text.js

export const encodeImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1]; // Extract base64 part from data URL
            resolve(base64String);
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsDataURL(file); // Start reading the file as a data URL
    });
};
export const decodeImage = (base64String) => {
    return `data:image/jpeg;base64,${base64String}`;
};

