var CryptoJS = CryptoJS || (function (Math, undefined) {
    var C = {};
    var C_lib = C.lib = {};
    var Base = C_lib.Base = (function () {
        function F() {};
        return {
            extend: function (overrides) {
                F.prototype = this;
                var subtype = new F();
                if (overrides) {
                    subtype.mixIn(overrides);
                }
                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
                    subtype.init = function () {
                        subtype.$super.init.apply(this, arguments);
                    };
                }
                subtype.init.prototype = subtype;
                subtype.$super = this;
                return subtype;
            }, create: function () {
                var instance = this.extend();
                instance.init.apply(instance, arguments);
                return instance;
            }, init: function () {}, mixIn: function (properties) {
                for (var propertyName in properties) {
                    if (properties.hasOwnProperty(propertyName)) {
                        this[propertyName] = properties[propertyName];
                    }
                }
                if (properties.hasOwnProperty('toString')) {
                    this.toString = properties.toString;
                }
            }, clone: function () {
                return this.init.prototype.extend(this);
            }
        };
    }());
    var WordArray = C_lib.WordArray = Base.extend({
        init: function (words, sigBytes) {
            words = this.words = words || [];
            if (sigBytes != undefined) {
                this.sigBytes = sigBytes;
            } else {
                this.sigBytes = words.length * 4;
            }
        }, toString: function (encoder) {
            return (encoder || Hex).stringify(this);
        }, concat: function (wordArray) {
            var thisWords = this.words;
            var thatWords = wordArray.words;
            var thisSigBytes = this.sigBytes;
            var thatSigBytes = wordArray.sigBytes;
            this.clamp();
            if (thisSigBytes % 4) {
                for (var i = 0; i < thatSigBytes; i++) {
                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
                }
            } else if (thatWords.length > 0xffff) {
                for (var i = 0; i < thatSigBytes; i += 4) {
                    thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
                }
            } else {
                thisWords.push.apply(thisWords, thatWords);
            }
            this.sigBytes += thatSigBytes;
            return this;
        }, clamp: function () {
            var words = this.words;
            var sigBytes = this.sigBytes;
            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
            words.length = Math.ceil(sigBytes / 4);
        }, clone: function () {
            var clone = Base.clone.call(this);
            clone.words = this.words.slice(0);
            return clone;
        }, random: function (nBytes) {
            var words = [];
            var r = (function (m_w) {
                var m_w = m_w;
                var m_z = 0x3ade68b1;
                var mask = 0xffffffff;
                return function () {
                    m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
                    m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
                    var result = ((m_z << 0x10) + m_w) & mask;
                    result /= 0x100000000;
                    result += 0.5;
                    return result * (Math.random() > .5 ? 1 : -1);
                }
            });
            for (var i = 0, rcache; i < nBytes; i += 4) {
                var _r = r((rcache || Math.random()) * 0x100000000);
                rcache = _r() * 0x3ade67b7;
                words.push((_r() * 0x100000000) | 0);
            }
            return new WordArray.init(words, nBytes);
        }
    });
    var C_enc = C.enc = {};
    var Hex = C_enc.Hex = {
        stringify: function (wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var hexChars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                hexChars.push((bite >>> 4).toString(16));
                hexChars.push((bite & 0x0f).toString(16));
            }
            return hexChars.join('');
        }, parse: function (hexStr) {
            var hexStrLength = hexStr.length;
            var words = [];
            for (var i = 0; i < hexStrLength; i += 2) {
                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
            }
            return new WordArray.init(words, hexStrLength / 2);
        }
    };
    var Latin1 = C_enc.Latin1 = {
        stringify: function (wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var latin1Chars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                latin1Chars.push(String.fromCharCode(bite));
            }
            return latin1Chars.join('');
        }, parse: function (latin1Str) {
            var latin1StrLength = latin1Str.length;
            var words = [];
            for (var i = 0; i < latin1StrLength; i++) {
                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
            }
            return new WordArray.init(words, latin1StrLength);
        }
    };
    var Utf8 = C_enc.Utf8 = {
        stringify: function (wordArray) {
            try {
                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
            } catch (e) {
                throw new Error('Malformed UTF-8 data');
            }
        }, parse: function (utf8Str) {
            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
        }
    };
    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
        reset: function () {
            this._data = new WordArray.init();
            this._nDataBytes = 0;
        }, _append: function (data) {
            if (typeof data == 'string') {
                data = Utf8.parse(data);
            }
            this._data.concat(data);
            this._nDataBytes += data.sigBytes;
        }, _process: function (doFlush) {
            var data = this._data;
            var dataWords = data.words;
            var dataSigBytes = data.sigBytes;
            var blockSize = this.blockSize;
            var blockSizeBytes = blockSize * 4;
            var nBlocksReady = dataSigBytes / blockSizeBytes;
            if (doFlush) {
                nBlocksReady = Math.ceil(nBlocksReady);
            } else {
                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
            }
            var nWordsReady = nBlocksReady * blockSize;
            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);
            if (nWordsReady) {
                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
                    this._doProcessBlock(dataWords, offset);
                }
                var processedWords = dataWords.splice(0, nWordsReady);
                data.sigBytes -= nBytesReady;
            }
            return new WordArray.init(processedWords, nBytesReady);
        }, clone: function () {
            var clone = Base.clone.call(this);
            clone._data = this._data.clone();
            return clone;
        }, _minBufferSize: 0
    });
    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
        cfg: Base.extend(),
        init: function (cfg) {
            this.cfg = this.cfg.extend(cfg);
            this.reset();
        }, reset: function () {
            BufferedBlockAlgorithm.reset.call(this);
            this._doReset();
        }, update: function (messageUpdate) {
            this._append(messageUpdate);
            this._process();
            return this;
        }, finalize: function (messageUpdate) {
            if (messageUpdate) {
                this._append(messageUpdate);
            }
            var hash = this._doFinalize();
            return hash;
        }, blockSize: 512 / 32,
        _createHelper: function (hasher) {
            return function (message, cfg) {
                return new hasher.init(cfg).finalize(message);
            };
        }, _createHmacHelper: function (hasher) {
            return function (message, key) {
                return new C_algo.HMAC.init(hasher, key).finalize(message);
            };
        }
    });
    var C_algo = C.algo = {};
    return C;
}(Math));

(function () {
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var C_enc = C.enc;
    var Base64 = C_enc.Base64 = {
        stringify: function (wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;
            wordArray.clamp();
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
                var byte1 = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;
                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;
                for (var j = 0;
                    (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                while (base64Chars.length % 4) {
                    base64Chars.push(paddingChar);
                }
            }
            return base64Chars.join('');
        }, parse: function (base64Str) {
            var base64StrLength = base64Str.length;
            var map = this._map;
            var reverseMap = this._reverseMap;
            if (!reverseMap) {
                reverseMap = this._reverseMap = [];
                for (var j = 0; j < map.length; j++) {
                    reverseMap[map.charCodeAt(j)] = j;
                }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                var paddingIndex = base64Str.indexOf(paddingChar);
                if (paddingIndex !== -1) {
                    base64StrLength = paddingIndex;
                }
            }
            return parseLoop(base64Str, base64StrLength, reverseMap);
        }, _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    };
    function parseLoop(base64Str, base64StrLength, reverseMap) {
        var words = [];
        var nBytes = 0;
        for (var i = 0; i < base64StrLength; i++) {
            if (i % 4) {
                var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
                var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
                words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                nBytes++;
            }
        }
        return WordArray.create(words, nBytes);
    }
}());

CryptoJS.lib.Cipher || (function (undefined) {
    var C = CryptoJS;
    var C_lib = C.lib;
    var Base = C_lib.Base;
    var WordArray = C_lib.WordArray;
    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
    var C_enc = C.enc;
    var Utf8 = C_enc.Utf8;
    var Base64 = C_enc.Base64;
    var C_algo = C.algo;
    var EvpKDF = C_algo.EvpKDF;
    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
        cfg: Base.extend(),
        createEncryptor: function (key, cfg) {
            return this.create(this._ENC_XFORM_MODE, key, cfg);
        }, createDecryptor: function (key, cfg) {
            return this.create(this._DEC_XFORM_MODE, key, cfg);
        }, init: function (xformMode, key, cfg) {
            this.cfg = this.cfg.extend(cfg);
            this._xformMode = xformMode;
            this._key = key;
            this.reset();
        }, reset: function () {
            BufferedBlockAlgorithm.reset.call(this);
            this._doReset();
        }, process: function (dataUpdate) {
            this._append(dataUpdate);
            return this._process();
        }, finalize: function (dataUpdate) {
            if (dataUpdate) {
                this._append(dataUpdate);
            }
            var finalProcessedData = this._doFinalize();
            return finalProcessedData;
        }, keySize: 128 / 32,
        ivSize: 128 / 32,
        _ENC_XFORM_MODE: 1,
        _DEC_XFORM_MODE: 2,
        _createHelper: (function () {
            function selectCipherStrategy(key) {
                if (typeof key == 'string') {
                    return PasswordBasedCipher;
                } else {
                    return SerializableCipher;
                }
            }
            return function (cipher) {
                return {
                    encrypt: function (message, key, cfg) {
                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
                    }, decrypt: function (ciphertext, key, cfg) {
                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
                    }
                };
            };
        }())
    });
    var StreamCipher = C_lib.StreamCipher = Cipher.extend({
        _doFinalize: function () {
            var finalProcessedBlocks = this._process(!!'flush');
            return finalProcessedBlocks;
        }, blockSize: 1
    });
    var C_mode = C.mode = {};
    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
        createEncryptor: function (cipher, iv) {
            return this.Encryptor.create(cipher, iv);
        }, createDecryptor: function (cipher, iv) {
            return this.Decryptor.create(cipher, iv);
        }, init: function (cipher, iv) {
            this._cipher = cipher;
            this._iv = iv;
        }
    });
    var CBC = C_mode.CBC = (function () {
        var CBC = BlockCipherMode.extend();
        CBC.Encryptor = CBC.extend({
            processBlock: function (words, offset) {
                var cipher = this._cipher;
                var blockSize = cipher.blockSize;
                xorBlock.call(this, words, offset, blockSize);
                cipher.encryptBlock(words, offset);
                this._prevBlock = words.slice(offset, offset + blockSize);
            }
        });
        CBC.Decryptor = CBC.extend({
            processBlock: function (words, offset) {
                var cipher = this._cipher;
                var blockSize = cipher.blockSize;
                var thisBlock = words.slice(offset, offset + blockSize);
                cipher.decryptBlock(words, offset);
                xorBlock.call(this, words, offset, blockSize);
                this._prevBlock = thisBlock;
            }
        });

        function xorBlock(words, offset, blockSize) {
            var iv = this._iv;
            if (iv) {
                var block = iv;
                this._iv = undefined;
            } else {
                var block = this._prevBlock;
            }
            for (var i = 0; i < blockSize; i++) {
                words[offset + i] ^= block[i];
            }
        }
        return CBC;
    }());
    var C_pad = C.pad = {};
    var Pkcs7 = C_pad.Pkcs7 = {
        pad: function (data, blockSize) {
            var blockSizeBytes = blockSize * 4;
            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;
            var paddingWords = [];
            for (var i = 0; i < nPaddingBytes; i += 4) {
                paddingWords.push(paddingWord);
            }
            var padding = WordArray.create(paddingWords, nPaddingBytes);
            data.concat(padding);
        }, unpad: function (data) {
            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;
            data.sigBytes -= nPaddingBytes;
        }
    };
    var BlockCipher = C_lib.BlockCipher = Cipher.extend({
        cfg: Cipher.cfg.extend({
            mode: CBC,
            padding: Pkcs7
        }),
        reset: function () {
            Cipher.reset.call(this);
            var cfg = this.cfg;
            var iv = cfg.iv;
            var mode = cfg.mode;
            if (this._xformMode == this._ENC_XFORM_MODE) {
                var modeCreator = mode.createEncryptor;
            } else {
                var modeCreator = mode.createDecryptor;
                this._minBufferSize = 1;
            } if (this._mode && this._mode.__creator == modeCreator) {
                this._mode.init(this, iv && iv.words);
            } else {
                this._mode = modeCreator.call(mode, this, iv && iv.words);
                this._mode.__creator = modeCreator;
            }
        }, _doProcessBlock: function (words, offset) {
            this._mode.processBlock(words, offset);
        }, _doFinalize: function () {
            var padding = this.cfg.padding;
            if (this._xformMode == this._ENC_XFORM_MODE) {
                padding.pad(this._data, this.blockSize);
                var finalProcessedBlocks = this._process(!!'flush');
            } else {
                var finalProcessedBlocks = this._process(!!'flush');
                padding.unpad(finalProcessedBlocks);
            }
            return finalProcessedBlocks;
        }, blockSize: 128 / 32
    });
    var CipherParams = C_lib.CipherParams = Base.extend({
        init: function (cipherParams) {
            this.mixIn(cipherParams);
        }, toString: function (formatter) {
            return (formatter || this.formatter).stringify(this);
        }
    });
    var C_format = C.format = {};
    var OpenSSLFormatter = C_format.OpenSSL = {
        stringify: function (cipherParams) {
            var ciphertext = cipherParams.ciphertext;
            var salt = cipherParams.salt;
            if (salt) {
                var wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
            } else {
                var wordArray = ciphertext;
            }
            return wordArray.toString(Base64);
        }, parse: function (openSSLStr) {
            var ciphertext = Base64.parse(openSSLStr);
            var ciphertextWords = ciphertext.words;
            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
                var salt = WordArray.create(ciphertextWords.slice(2, 4));
                ciphertextWords.splice(0, 4);
                ciphertext.sigBytes -= 16;
            }
            return CipherParams.create({
                ciphertext: ciphertext,
                salt: salt
            });
        }
    };
    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
        cfg: Base.extend({
            format: OpenSSLFormatter
        }),
        encrypt: function (cipher, message, key, cfg) {
            cfg = this.cfg.extend(cfg);
            var encryptor = cipher.createEncryptor(key, cfg);
            var ciphertext = encryptor.finalize(message);
            var cipherCfg = encryptor.cfg;
            return CipherParams.create({
                ciphertext: ciphertext,
                key: key,
                iv: cipherCfg.iv,
                algorithm: cipher,
                mode: cipherCfg.mode,
                padding: cipherCfg.padding,
                blockSize: cipher.blockSize,
                formatter: cfg.format
            });
        }, decrypt: function (cipher, ciphertext, key, cfg) {
            cfg = this.cfg.extend(cfg);
            ciphertext = this._parse(ciphertext, cfg.format);
            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);
            return plaintext;
        }, _parse: function (ciphertext, format) {
            if (typeof ciphertext == 'string') {
                return format.parse(ciphertext, this);
            } else {
                return ciphertext;
            }
        }
    });
    var C_kdf = C.kdf = {};
    var OpenSSLKdf = C_kdf.OpenSSL = {
        execute: function (password, keySize, ivSize, salt) {
            if (!salt) {
                salt = WordArray.random(64 / 8);
            }
            var key = EvpKDF.create({
                keySize: keySize + ivSize
            }).compute(password, salt);
            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
            key.sigBytes = keySize * 4;
            return CipherParams.create({
                key: key,
                iv: iv,
                salt: salt
            });
        }
    };
    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
        cfg: SerializableCipher.cfg.extend({
            kdf: OpenSSLKdf
        }),
        encrypt: function (cipher, message, password, cfg) {
            cfg = this.cfg.extend(cfg);
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize);
            cfg.iv = derivedParams.iv;
            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);
            ciphertext.mixIn(derivedParams);
            return ciphertext;
        }, decrypt: function (cipher, ciphertext, password, cfg) {
            cfg = this.cfg.extend(cfg);
            ciphertext = this._parse(ciphertext, cfg.format);
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);
            cfg.iv = derivedParams.iv;
            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);
            return plaintext;
        }
    });
}());

CryptoJS.mode.ECB = (function () {
    var ECB = CryptoJS.lib.BlockCipherMode.extend();
    ECB.Encryptor = ECB.extend({
        processBlock: function (words, offset) {
            this._cipher.encryptBlock(words, offset);
        }
    });
    ECB.Decryptor = ECB.extend({
        processBlock: function (words, offset) {
            this._cipher.decryptBlock(words, offset);
        }
    });
    return ECB;
}());

CryptoJS.pad.ZeroPadding = {
    pad: function (data, blockSize) {
        var blockSizeBytes = blockSize * 4;
        data.clamp();
        data.sigBytes += blockSizeBytes - ((data.sigBytes % blockSizeBytes) || blockSizeBytes);
    }, unpad: function (data) {
        var dataWords = data.words;
        var i = data.sigBytes - 1;
        while (!((dataWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)) {
            i--;
        }
        data.sigBytes = i + 1;
    }
};

(function () {
    var C = CryptoJS;
    var C_lib = C.lib;
    var WordArray = C_lib.WordArray;
    var BlockCipher = C_lib.BlockCipher;
    var C_algo = C.algo;
    var PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4];
    var PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32];
    var BIT_SHIFTS = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];
    var SBOX_P = [{
        0x0: 0x808200,
        0x10000000: 0x8000,
        0x20000000: 0x808002,
        0x30000000: 0x2,
        0x40000000: 0x200,
        0x50000000: 0x808202,
        0x60000000: 0x800202,
        0x70000000: 0x800000,
        0x80000000: 0x202,
        0x90000000: 0x800200,
        0xa0000000: 0x8200,
        0xb0000000: 0x808000,
        0xc0000000: 0x8002,
        0xd0000000: 0x800002,
        0xe0000000: 0x0,
        0xf0000000: 0x8202,
        0x8000000: 0x0,
        0x18000000: 0x808202,
        0x28000000: 0x8202,
        0x38000000: 0x8000,
        0x48000000: 0x808200,
        0x58000000: 0x200,
        0x68000000: 0x808002,
        0x78000000: 0x2,
        0x88000000: 0x800200,
        0x98000000: 0x8200,
        0xa8000000: 0x808000,
        0xb8000000: 0x800202,
        0xc8000000: 0x800002,
        0xd8000000: 0x8002,
        0xe8000000: 0x202,
        0xf8000000: 0x800000,
        0x1: 0x8000,
        0x10000001: 0x2,
        0x20000001: 0x808200,
        0x30000001: 0x800000,
        0x40000001: 0x808002,
        0x50000001: 0x8200,
        0x60000001: 0x200,
        0x70000001: 0x800202,
        0x80000001: 0x808202,
        0x90000001: 0x808000,
        0xa0000001: 0x800002,
        0xb0000001: 0x8202,
        0xc0000001: 0x202,
        0xd0000001: 0x800200,
        0xe0000001: 0x8002,
        0xf0000001: 0x0,
        0x8000001: 0x808202,
        0x18000001: 0x808000,
        0x28000001: 0x800000,
        0x38000001: 0x200,
        0x48000001: 0x8000,
        0x58000001: 0x800002,
        0x68000001: 0x2,
        0x78000001: 0x8202,
        0x88000001: 0x8002,
        0x98000001: 0x800202,
        0xa8000001: 0x202,
        0xb8000001: 0x808200,
        0xc8000001: 0x800200,
        0xd8000001: 0x0,
        0xe8000001: 0x8200,
        0xf8000001: 0x808002
    }, {
        0x0: 0x40084010,
        0x1000000: 0x4000,
        0x2000000: 0x80000,
        0x3000000: 0x40080010,
        0x4000000: 0x40000010,
        0x5000000: 0x40084000,
        0x6000000: 0x40004000,
        0x7000000: 0x10,
        0x8000000: 0x84000,
        0x9000000: 0x40004010,
        0xa000000: 0x40000000,
        0xb000000: 0x84010,
        0xc000000: 0x80010,
        0xd000000: 0x0,
        0xe000000: 0x4010,
        0xf000000: 0x40080000,
        0x800000: 0x40004000,
        0x1800000: 0x84010,
        0x2800000: 0x10,
        0x3800000: 0x40004010,
        0x4800000: 0x40084010,
        0x5800000: 0x40000000,
        0x6800000: 0x80000,
        0x7800000: 0x40080010,
        0x8800000: 0x80010,
        0x9800000: 0x0,
        0xa800000: 0x4000,
        0xb800000: 0x40080000,
        0xc800000: 0x40000010,
        0xd800000: 0x84000,
        0xe800000: 0x40084000,
        0xf800000: 0x4010,
        0x10000000: 0x0,
        0x11000000: 0x40080010,
        0x12000000: 0x40004010,
        0x13000000: 0x40084000,
        0x14000000: 0x40080000,
        0x15000000: 0x10,
        0x16000000: 0x84010,
        0x17000000: 0x4000,
        0x18000000: 0x4010,
        0x19000000: 0x80000,
        0x1a000000: 0x80010,
        0x1b000000: 0x40000010,
        0x1c000000: 0x84000,
        0x1d000000: 0x40004000,
        0x1e000000: 0x40000000,
        0x1f000000: 0x40084010,
        0x10800000: 0x84010,
        0x11800000: 0x80000,
        0x12800000: 0x40080000,
        0x13800000: 0x4000,
        0x14800000: 0x40004000,
        0x15800000: 0x40084010,
        0x16800000: 0x10,
        0x17800000: 0x40000000,
        0x18800000: 0x40084000,
        0x19800000: 0x40000010,
        0x1a800000: 0x40004010,
        0x1b800000: 0x80010,
        0x1c800000: 0x0,
        0x1d800000: 0x4010,
        0x1e800000: 0x40080010,
        0x1f800000: 0x84000
    }, {
        0x0: 0x104,
        0x100000: 0x0,
        0x200000: 0x4000100,
        0x300000: 0x10104,
        0x400000: 0x10004,
        0x500000: 0x4000004,
        0x600000: 0x4010104,
        0x700000: 0x4010000,
        0x800000: 0x4000000,
        0x900000: 0x4010100,
        0xa00000: 0x10100,
        0xb00000: 0x4010004,
        0xc00000: 0x4000104,
        0xd00000: 0x10000,
        0xe00000: 0x4,
        0xf00000: 0x100,
        0x80000: 0x4010100,
        0x180000: 0x4010004,
        0x280000: 0x0,
        0x380000: 0x4000100,
        0x480000: 0x4000004,
        0x580000: 0x10000,
        0x680000: 0x10004,
        0x780000: 0x104,
        0x880000: 0x4,
        0x980000: 0x100,
        0xa80000: 0x4010000,
        0xb80000: 0x10104,
        0xc80000: 0x10100,
        0xd80000: 0x4000104,
        0xe80000: 0x4010104,
        0xf80000: 0x4000000,
        0x1000000: 0x4010100,
        0x1100000: 0x10004,
        0x1200000: 0x10000,
        0x1300000: 0x4000100,
        0x1400000: 0x100,
        0x1500000: 0x4010104,
        0x1600000: 0x4000004,
        0x1700000: 0x0,
        0x1800000: 0x4000104,
        0x1900000: 0x4000000,
        0x1a00000: 0x4,
        0x1b00000: 0x10100,
        0x1c00000: 0x4010000,
        0x1d00000: 0x104,
        0x1e00000: 0x10104,
        0x1f00000: 0x4010004,
        0x1080000: 0x4000000,
        0x1180000: 0x104,
        0x1280000: 0x4010100,
        0x1380000: 0x0,
        0x1480000: 0x10004,
        0x1580000: 0x4000100,
        0x1680000: 0x100,
        0x1780000: 0x4010004,
        0x1880000: 0x10000,
        0x1980000: 0x4010104,
        0x1a80000: 0x10104,
        0x1b80000: 0x4000004,
        0x1c80000: 0x4000104,
        0x1d80000: 0x4010000,
        0x1e80000: 0x4,
        0x1f80000: 0x10100
    }, {
        0x0: 0x80401000,
        0x10000: 0x80001040,
        0x20000: 0x401040,
        0x30000: 0x80400000,
        0x40000: 0x0,
        0x50000: 0x401000,
        0x60000: 0x80000040,
        0x70000: 0x400040,
        0x80000: 0x80000000,
        0x90000: 0x400000,
        0xa0000: 0x40,
        0xb0000: 0x80001000,
        0xc0000: 0x80400040,
        0xd0000: 0x1040,
        0xe0000: 0x1000,
        0xf0000: 0x80401040,
        0x8000: 0x80001040,
        0x18000: 0x40,
        0x28000: 0x80400040,
        0x38000: 0x80001000,
        0x48000: 0x401000,
        0x58000: 0x80401040,
        0x68000: 0x0,
        0x78000: 0x80400000,
        0x88000: 0x1000,
        0x98000: 0x80401000,
        0xa8000: 0x400000,
        0xb8000: 0x1040,
        0xc8000: 0x80000000,
        0xd8000: 0x400040,
        0xe8000: 0x401040,
        0xf8000: 0x80000040,
        0x100000: 0x400040,
        0x110000: 0x401000,
        0x120000: 0x80000040,
        0x130000: 0x0,
        0x140000: 0x1040,
        0x150000: 0x80400040,
        0x160000: 0x80401000,
        0x170000: 0x80001040,
        0x180000: 0x80401040,
        0x190000: 0x80000000,
        0x1a0000: 0x80400000,
        0x1b0000: 0x401040,
        0x1c0000: 0x80001000,
        0x1d0000: 0x400000,
        0x1e0000: 0x40,
        0x1f0000: 0x1000,
        0x108000: 0x80400000,
        0x118000: 0x80401040,
        0x128000: 0x0,
        0x138000: 0x401000,
        0x148000: 0x400040,
        0x158000: 0x80000000,
        0x168000: 0x80001040,
        0x178000: 0x40,
        0x188000: 0x80000040,
        0x198000: 0x1000,
        0x1a8000: 0x80001000,
        0x1b8000: 0x80400040,
        0x1c8000: 0x1040,
        0x1d8000: 0x80401000,
        0x1e8000: 0x400000,
        0x1f8000: 0x401040
    }, {
        0x0: 0x80,
        0x1000: 0x1040000,
        0x2000: 0x40000,
        0x3000: 0x20000000,
        0x4000: 0x20040080,
        0x5000: 0x1000080,
        0x6000: 0x21000080,
        0x7000: 0x40080,
        0x8000: 0x1000000,
        0x9000: 0x20040000,
        0xa000: 0x20000080,
        0xb000: 0x21040080,
        0xc000: 0x21040000,
        0xd000: 0x0,
        0xe000: 0x1040080,
        0xf000: 0x21000000,
        0x800: 0x1040080,
        0x1800: 0x21000080,
        0x2800: 0x80,
        0x3800: 0x1040000,
        0x4800: 0x40000,
        0x5800: 0x20040080,
        0x6800: 0x21040000,
        0x7800: 0x20000000,
        0x8800: 0x20040000,
        0x9800: 0x0,
        0xa800: 0x21040080,
        0xb800: 0x1000080,
        0xc800: 0x20000080,
        0xd800: 0x21000000,
        0xe800: 0x1000000,
        0xf800: 0x40080,
        0x10000: 0x40000,
        0x11000: 0x80,
        0x12000: 0x20000000,
        0x13000: 0x21000080,
        0x14000: 0x1000080,
        0x15000: 0x21040000,
        0x16000: 0x20040080,
        0x17000: 0x1000000,
        0x18000: 0x21040080,
        0x19000: 0x21000000,
        0x1a000: 0x1040000,
        0x1b000: 0x20040000,
        0x1c000: 0x40080,
        0x1d000: 0x20000080,
        0x1e000: 0x0,
        0x1f000: 0x1040080,
        0x10800: 0x21000080,
        0x11800: 0x1000000,
        0x12800: 0x1040000,
        0x13800: 0x20040080,
        0x14800: 0x20000000,
        0x15800: 0x1040080,
        0x16800: 0x80,
        0x17800: 0x21040000,
        0x18800: 0x40080,
        0x19800: 0x21040080,
        0x1a800: 0x0,
        0x1b800: 0x21000000,
        0x1c800: 0x1000080,
        0x1d800: 0x40000,
        0x1e800: 0x20040000,
        0x1f800: 0x20000080
    }, {
        0x0: 0x10000008,
        0x100: 0x2000,
        0x200: 0x10200000,
        0x300: 0x10202008,
        0x400: 0x10002000,
        0x500: 0x200000,
        0x600: 0x200008,
        0x700: 0x10000000,
        0x800: 0x0,
        0x900: 0x10002008,
        0xa00: 0x202000,
        0xb00: 0x8,
        0xc00: 0x10200008,
        0xd00: 0x202008,
        0xe00: 0x2008,
        0xf00: 0x10202000,
        0x80: 0x10200000,
        0x180: 0x10202008,
        0x280: 0x8,
        0x380: 0x200000,
        0x480: 0x202008,
        0x580: 0x10000008,
        0x680: 0x10002000,
        0x780: 0x2008,
        0x880: 0x200008,
        0x980: 0x2000,
        0xa80: 0x10002008,
        0xb80: 0x10200008,
        0xc80: 0x0,
        0xd80: 0x10202000,
        0xe80: 0x202000,
        0xf80: 0x10000000,
        0x1000: 0x10002000,
        0x1100: 0x10200008,
        0x1200: 0x10202008,
        0x1300: 0x2008,
        0x1400: 0x200000,
        0x1500: 0x10000000,
        0x1600: 0x10000008,
        0x1700: 0x202000,
        0x1800: 0x202008,
        0x1900: 0x0,
        0x1a00: 0x8,
        0x1b00: 0x10200000,
        0x1c00: 0x2000,
        0x1d00: 0x10002008,
        0x1e00: 0x10202000,
        0x1f00: 0x200008,
        0x1080: 0x8,
        0x1180: 0x202000,
        0x1280: 0x200000,
        0x1380: 0x10000008,
        0x1480: 0x10002000,
        0x1580: 0x2008,
        0x1680: 0x10202008,
        0x1780: 0x10200000,
        0x1880: 0x10202000,
        0x1980: 0x10200008,
        0x1a80: 0x2000,
        0x1b80: 0x202008,
        0x1c80: 0x200008,
        0x1d80: 0x0,
        0x1e80: 0x10000000,
        0x1f80: 0x10002008
    }, {
        0x0: 0x100000,
        0x10: 0x2000401,
        0x20: 0x400,
        0x30: 0x100401,
        0x40: 0x2100401,
        0x50: 0x0,
        0x60: 0x1,
        0x70: 0x2100001,
        0x80: 0x2000400,
        0x90: 0x100001,
        0xa0: 0x2000001,
        0xb0: 0x2100400,
        0xc0: 0x2100000,
        0xd0: 0x401,
        0xe0: 0x100400,
        0xf0: 0x2000000,
        0x8: 0x2100001,
        0x18: 0x0,
        0x28: 0x2000401,
        0x38: 0x2100400,
        0x48: 0x100000,
        0x58: 0x2000001,
        0x68: 0x2000000,
        0x78: 0x401,
        0x88: 0x100401,
        0x98: 0x2000400,
        0xa8: 0x2100000,
        0xb8: 0x100001,
        0xc8: 0x400,
        0xd8: 0x2100401,
        0xe8: 0x1,
        0xf8: 0x100400,
        0x100: 0x2000000,
        0x110: 0x100000,
        0x120: 0x2000401,
        0x130: 0x2100001,
        0x140: 0x100001,
        0x150: 0x2000400,
        0x160: 0x2100400,
        0x170: 0x100401,
        0x180: 0x401,
        0x190: 0x2100401,
        0x1a0: 0x100400,
        0x1b0: 0x1,
        0x1c0: 0x0,
        0x1d0: 0x2100000,
        0x1e0: 0x2000001,
        0x1f0: 0x400,
        0x108: 0x100400,
        0x118: 0x2000401,
        0x128: 0x2100001,
        0x138: 0x1,
        0x148: 0x2000000,
        0x158: 0x100000,
        0x168: 0x401,
        0x178: 0x2100400,
        0x188: 0x2000001,
        0x198: 0x2100000,
        0x1a8: 0x0,
        0x1b8: 0x2100401,
        0x1c8: 0x100401,
        0x1d8: 0x400,
        0x1e8: 0x2000400,
        0x1f8: 0x100001
    }, {
        0x0: 0x8000820,
        0x1: 0x20000,
        0x2: 0x8000000,
        0x3: 0x20,
        0x4: 0x20020,
        0x5: 0x8020820,
        0x6: 0x8020800,
        0x7: 0x800,
        0x8: 0x8020000,
        0x9: 0x8000800,
        0xa: 0x20800,
        0xb: 0x8020020,
        0xc: 0x820,
        0xd: 0x0,
        0xe: 0x8000020,
        0xf: 0x20820,
        0x80000000: 0x800,
        0x80000001: 0x8020820,
        0x80000002: 0x8000820,
        0x80000003: 0x8000000,
        0x80000004: 0x8020000,
        0x80000005: 0x20800,
        0x80000006: 0x20820,
        0x80000007: 0x20,
        0x80000008: 0x8000020,
        0x80000009: 0x820,
        0x8000000a: 0x20020,
        0x8000000b: 0x8020800,
        0x8000000c: 0x0,
        0x8000000d: 0x8020020,
        0x8000000e: 0x8000800,
        0x8000000f: 0x20000,
        0x10: 0x20820,
        0x11: 0x8020800,
        0x12: 0x20,
        0x13: 0x800,
        0x14: 0x8000800,
        0x15: 0x8000020,
        0x16: 0x8020020,
        0x17: 0x20000,
        0x18: 0x0,
        0x19: 0x20020,
        0x1a: 0x8020000,
        0x1b: 0x8000820,
        0x1c: 0x8020820,
        0x1d: 0x20800,
        0x1e: 0x820,
        0x1f: 0x8000000,
        0x80000010: 0x20000,
        0x80000011: 0x800,
        0x80000012: 0x8020020,
        0x80000013: 0x20820,
        0x80000014: 0x20,
        0x80000015: 0x8020000,
        0x80000016: 0x8000000,
        0x80000017: 0x8000820,
        0x80000018: 0x8020820,
        0x80000019: 0x8000020,
        0x8000001a: 0x8000800,
        0x8000001b: 0x0,
        0x8000001c: 0x20800,
        0x8000001d: 0x820,
        0x8000001e: 0x20020,
        0x8000001f: 0x8020800
    }];
    var SBOX_MASK = [0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000, 0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f];
    var DES = C_algo.DES = BlockCipher.extend({
        _doReset: function () {
            var key = this._key;
            var keyWords = key.words;
            var keyBits = [];
            for (var i = 0; i < 56; i++) {
                var keyBitPos = PC1[i] - 1;
                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
            }
            var subKeys = this._subKeys = [];
            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
                var subKey = subKeys[nSubKey] = [];
                var bitShift = BIT_SHIFTS[nSubKey];
                for (var i = 0; i < 24; i++) {
                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);
                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
                }
                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
                for (var i = 1; i < 7; i++) {
                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
                }
                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
            }
            var invSubKeys = this._invSubKeys = [];
            for (var i = 0; i < 16; i++) {
                invSubKeys[i] = subKeys[15 - i];
            }
        }, encryptBlock: function (M, offset) {
            this._doCryptBlock(M, offset, this._subKeys);
        }, decryptBlock: function (M, offset) {
            this._doCryptBlock(M, offset, this._invSubKeys);
        }, _doCryptBlock: function (M, offset, subKeys) {
            this._lBlock = M[offset];
            this._rBlock = M[offset + 1];
            exchangeLR.call(this, 4, 0x0f0f0f0f);
            exchangeLR.call(this, 16, 0x0000ffff);
            exchangeRL.call(this, 2, 0x33333333);
            exchangeRL.call(this, 8, 0x00ff00ff);
            exchangeLR.call(this, 1, 0x55555555);
            for (var round = 0; round < 16; round++) {
                var subKey = subKeys[round];
                var lBlock = this._lBlock;
                var rBlock = this._rBlock;
                var f = 0;
                for (var i = 0; i < 8; i++) {
                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
                }
                this._lBlock = rBlock;
                this._rBlock = lBlock ^ f;
            }
            var t = this._lBlock;
            this._lBlock = this._rBlock;
            this._rBlock = t;
            exchangeLR.call(this, 1, 0x55555555);
            exchangeRL.call(this, 8, 0x00ff00ff);
            exchangeRL.call(this, 2, 0x33333333);
            exchangeLR.call(this, 16, 0x0000ffff);
            exchangeLR.call(this, 4, 0x0f0f0f0f);
            M[offset] = this._lBlock;
            M[offset + 1] = this._rBlock;
        }, keySize: 64 / 32,
        ivSize: 64 / 32,
        blockSize: 64 / 32
    });
    function exchangeLR(offset, mask) {
        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
        this._rBlock ^= t;
        this._lBlock ^= t << offset;
    }
    function exchangeRL(offset, mask) {
        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
        this._lBlock ^= t;
        this._rBlock ^= t << offset;
    }
    C.DES = BlockCipher._createHelper(DES);
    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
        _doReset: function () {
            var key = this._key;
            var keyWords = key.words;
            this._des1 = DES.createEncryptor(WordArray.create(keyWords.slice(0, 2)));
            this._des2 = DES.createEncryptor(WordArray.create(keyWords.slice(2, 4)));
            this._des3 = DES.createEncryptor(WordArray.create(keyWords.slice(4, 6)));
        }, encryptBlock: function (M, offset) {
            this._des1.encryptBlock(M, offset);
            this._des2.decryptBlock(M, offset);
            this._des3.encryptBlock(M, offset);
        }, decryptBlock: function (M, offset) {
            this._des3.decryptBlock(M, offset);
            this._des2.encryptBlock(M, offset);
            this._des1.decryptBlock(M, offset);
        }, keySize: 192 / 32,
        ivSize: 64 / 32,
        blockSize: 64 / 32
    });
    C.TripleDES = BlockCipher._createHelper(TripleDES);
}());


function DES_Encrypt(word,key) {
    var srcs = CryptoJS.enc.Utf8.parse(word);
    var encrypted = CryptoJS.DES.encrypt(srcs, CryptoJS.enc.Utf8.parse(key), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.ZeroPadding
    });
    return encrypted.toString();
}
